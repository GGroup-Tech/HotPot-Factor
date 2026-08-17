"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUsuario } from "@/lib/supabase/staff";
import { toISODate } from "@/lib/calendario";
import { puedeEditarPedido, COMODINES_POR_MES, HORAS_CORTE_EDICION } from "@/lib/creditos";

export interface AccionPedidoResult {
  ok: boolean;
  error?: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function anioMesDeFecha(fecha: Date): { anio: number; mes: number } {
  return { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 };
}

/**
 * Estas tres acciones son las mismas para el flujo de compra
 * (`/arma-tu-mes`) y para el panel de cliente (`/cuenta/calendario`)
 * — ambas rutas leen y escriben el mismo `pedidos`/`credito_movimientos`
 * de un usuario ya autenticado, no hay estado "de flujo" involucrado.
 * Por eso se revalida en ambos paths sin importar desde cuál se llamó.
 */
function revalidarCalendario() {
  revalidatePath("/arma-tu-mes");
  revalidatePath("/cuenta/calendario");
}

/**
 * `comodines_mes` NO es un contador de uso por usuario — es config de
 * qué platillos son válidos como comodín en un anio/mes (confirmado
 * contra el esquema real 2026-08-13: id, anio, mes, platillo_id,
 * creado_en — sin usuario_id ni "usados"). Cuántos comodines ya usó
 * un usuario este mes se deriva contando sus propios `pedidos` con
 * `es_comodin = true`, igual que el saldo de créditos se deriva de
 * `credito_movimientos` — nunca un contador cacheado que se pueda
 * desincronizar.
 */
async function contarComodinesUsados(
  supabase: SupabaseServerClient,
  usuarioId: string,
  anio: number,
  mes: number,
  excluirPedidoId?: string,
): Promise<number> {
  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);
  let query = supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("es_comodin", true)
    .neq("estado", "cancelado")
    .gte("fecha_entrega", toISODate(primerDia))
    .lte("fecha_entrega", toISODate(ultimoDia));
  if (excluirPedidoId) query = query.neq("id", excluirPedidoId);
  const { count } = await query;
  return count ?? 0;
}

/** true si `platilloId` está configurado como comodín válido ese anio/mes. */
async function esComodinValido(
  supabase: SupabaseServerClient,
  platilloId: string,
  anio: number,
  mes: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("comodines_mes")
    .select("id")
    .eq("anio", anio)
    .eq("mes", mes)
    .eq("platillo_id", platilloId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Asigna el platillo fijo (o un comodín) a una fecha. Consume 1
 * crédito: inserta -1 en `credito_movimientos` (append-only) ligado al
 * pedido recién creado. `pedidos` tiene UNIQUE(usuario_id,
 * fecha_entrega) así que un doble submit falla limpio en vez de
 * duplicar la entrega.
 */
export async function asignarPedido(
  fechaEntrega: string,
  platilloId: string,
  esComodin: boolean,
): Promise<AccionPedidoResult> {
  const { user } = await requireUsuario();
  const supabase = await createClient();
  const fecha = new Date(`${fechaEntrega}T00:00:00`);
  if (!puedeEditarPedido(fecha)) {
    return { ok: false, error: "Esta fecha ya está dentro de las 48 horas de corte." };
  }
  const { data: saldoRow } = await supabase
    .from("saldo_creditos")
    .select("saldo")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!saldoRow || saldoRow.saldo < 1) {
    return { ok: false, error: "No tienes créditos disponibles." };
  }
  const { anio, mes } = anioMesDeFecha(fecha);
  if (esComodin) {
    const valido = await esComodinValido(supabase, platilloId, anio, mes);
    if (!valido) {
      return { ok: false, error: "Ese platillo no está disponible como comodín este mes." };
    }
    const usados = await contarComodinesUsados(supabase, user.id, anio, mes);
    if (usados >= COMODINES_POR_MES) {
      return { ok: false, error: "Ya usaste tus 2 comodines de este mes." };
    }
  }
  // `pedidos.corte_edicion` es NOT NULL y la policy
  // `usuario_edita_pedidos_en_plazo` (UPDATE) depende de esta columna
  // (`now() < corte_edicion`). Se calcula igual que `puedeEditarPedido`:
  // 48h antes de la medianoche del día de entrega.
  const corteEdicion = new Date(fecha.getTime() - HORAS_CORTE_EDICION * 60 * 60 * 1000);
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({
      usuario_id: user.id,
      fecha_entrega: fechaEntrega,
      estado: "programado",
      platillo_id: platilloId,
      es_comodin: esComodin,
      corte_edicion: corteEdicion.toISOString(),
    })
    .select("id")
    .single();
  if (pedidoError || !pedido) {
    console.error("asignarPedido: INSERT a `pedidos` falló", {
      usuarioId: user.id,
      fechaEntrega,
      platilloId,
      esComodin,
      code: (pedidoError as { code?: string } | null)?.code,
      message: pedidoError?.message,
      details: (pedidoError as { details?: string } | null)?.details,
      hint: (pedidoError as { hint?: string } | null)?.hint,
    });
    if ((pedidoError as { code?: string } | null)?.code === "23505") {
      return { ok: false, error: "Ya tienes una entrega asignada ese día." };
    }
    return { ok: false, error: "No se pudo asignar la entrega." };
  }
  // Corregido 2026-08-17: la columna real en `credito_movimientos` es
  // `referencia_id`, no `pedido_id` (confirmado contra
  // information_schema.columns) — por eso todo INSERT aquí fallaba con
  // PGRST204 y ningún crédito se descontaba de verdad nunca.
  const { error: movError } = await supabase.from("credito_movimientos").insert({
    usuario_id: user.id,
    cantidad: -1,
    tipo: "consumo",
    referencia_id: pedido.id,
  });
  if (movError) {
    console.error("asignarPedido: INSERT a `credito_movimientos` falló", {
      usuarioId: user.id,
      pedidoId: pedido.id,
      code: (movError as { code?: string } | null)?.code,
      message: movError.message,
    });
    return { ok: false, error: "No se pudo descontar el crédito." };
  }
  revalidarCalendario();
  return { ok: true };
}

/**
 * Cancela una entrega dentro del plazo. El crédito regresa libre al
 * saldo (regla invariante) vía un movimiento +1 — nunca se edita el
 * movimiento de consumo original porque `credito_movimientos` es
 * append-only. Si era comodín, no hace falta "liberarlo" en ningún
 * lado: el conteo de comodines usados se deriva de `pedidos` sin
 * cancelar, así que cancelar este ya lo saca de la cuenta.
 */
export async function cancelarPedido(pedidoId: string): Promise<AccionPedidoResult> {
  const { user } = await requireUsuario();
  const supabase = await createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, usuario_id, fecha_entrega, es_comodin, estado")
    .eq("id", pedidoId)
    .single();
  if (!pedido || pedido.usuario_id !== user.id) {
    return { ok: false, error: "Entrega no encontrada." };
  }
  if (!puedeEditarPedido(new Date(`${pedido.fecha_entrega}T00:00:00`))) {
    return { ok: false, error: "Esta entrega ya está dentro de las 48 horas de corte." };
  }
  if (pedido.estado === "cancelado") {
    return { ok: true };
  }
  // `.select().maybeSingle()` en vez de un `.update()` a secas: si RLS
  // bloquea el UPDATE, PostgREST no regresa error — regresa éxito con
  // 0 filas afectadas. Sin este chequeo el usuario ve "cancelado" en
  // el toast pero al recargar el calendario sigue exactamente igual.
  const { data: canceladoRow, error: updateError } = await supabase
    .from("pedidos")
    .update({ estado: "cancelado" })
    .eq("id", pedidoId)
    .select("id")
    .maybeSingle();
  if (updateError) {
    console.error("cancelarPedido: UPDATE falló", { pedidoId, message: updateError.message });
    return { ok: false, error: "No se pudo cancelar." };
  }
  if (!canceladoRow) {
    return {
      ok: false,
      error: "No se pudo cancelar: falta una política de acceso en la base de datos. Contacta soporte técnico.",
    };
  }
  await supabase.from("credito_movimientos").insert({
    usuario_id: user.id,
    cantidad: 1,
    tipo: "cancelacion",
    referencia_id: pedidoId,
  });
  revalidarCalendario();
  return { ok: true };
}

/**
 * Cambia el platillo (o el estatus de comodín) de una entrega ya
 * asignada, sin tocar el saldo de créditos — el crédito ya se cobró
 * al asignar. Si el cambio cruza la frontera platillo fijo → comodín,
 * sí revalida el límite de 2/mes (excluyendo este mismo pedido del
 * conteo, porque todavía no es comodín en la fila actual).
 */
export async function editarPedido(
  pedidoId: string,
  nuevoPlatilloId: string,
  esComodin: boolean,
): Promise<AccionPedidoResult> {
  const { user } = await requireUsuario();
  const supabase = await createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, usuario_id, fecha_entrega, es_comodin")
    .eq("id", pedidoId)
    .single();
  if (!pedido || pedido.usuario_id !== user.id) {
    return { ok: false, error: "Entrega no encontrada." };
  }
  if (!puedeEditarPedido(new Date(`${pedido.fecha_entrega}T00:00:00`))) {
    return { ok: false, error: "Esta entrega ya está dentro de las 48 horas de corte." };
  }
  const { anio, mes } = anioMesDeFecha(new Date(`${pedido.fecha_entrega}T00:00:00`));
  if (esComodin && !pedido.es_comodin) {
    const valido = await esComodinValido(supabase, nuevoPlatilloId, anio, mes);
    if (!valido) {
      return { ok: false, error: "Ese platillo no está disponible como comodín este mes." };
    }
    const usados = await contarComodinesUsados(supabase, user.id, anio, mes, pedidoId);
    if (usados >= COMODINES_POR_MES) {
      return { ok: false, error: "Ya usaste tus 2 comodines de este mes." };
    }
  }
  const { data: editadoRow, error } = await supabase
    .from("pedidos")
    .update({ platillo_id: nuevoPlatilloId, es_comodin: esComodin })
    .eq("id", pedidoId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("editarPedido: UPDATE falló", { pedidoId, message: error.message });
    return { ok: false, error: "No se pudo actualizar la entrega." };
  }
  if (!editadoRow) {
    return {
      ok: false,
      error: "No se pudo actualizar: falta una política de acceso en la base de datos. Contacta soporte técnico.",
    };
  }
  revalidarCalendario();
  return { ok: true };
}
