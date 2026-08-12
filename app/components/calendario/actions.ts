"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUsuario } from "@/lib/supabase/staff";
import { puedeEditarPedido, COMODINES_POR_MES } from "@/lib/creditos";

export interface AccionPedidoResult {
  ok: boolean;
  error?: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function primerDiaDelMes(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
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
 * Suma `delta` (positivo o negativo) al contador de comodines usados
 * de un usuario en un mes, sin bajar de 0. Reemplaza dos bugs que
 * había antes:
 *  1. `asignarPedido` hacía `upsert({ usados: 1 })` a secas — en vez de
 *     incrementar, SIEMPRE dejaba `usados` en 1, sin importar cuántos
 *     comodines llevaras. Resultado: el límite de 2/mes nunca se
 *     alcanzaba y un usuario podía usar comodines sin límite.
 *  2. `cancelarPedido` llamaba a un RPC `liberar_comodin` que nunca
 *     se creó en la base de datos (quedó como nota pendiente) — la
 *     llamada fallaba en silencio (no se revisaba el error) y el
 *     comodín cancelado nunca se liberaba.
 * Todo el conteo ahora se hace en JS, leyendo el valor actual antes
 * de escribir — no depende de ningún trigger/RPC externo.
 */
async function ajustarComodinesMes(
  supabase: SupabaseServerClient,
  usuarioId: string,
  mes: string,
  delta: number,
): Promise<void> {
  const { data: comodinRow } = await supabase
    .from("comodines_mes")
    .select("usados")
    .eq("usuario_id", usuarioId)
    .eq("mes", mes)
    .maybeSingle();

  const nuevoUsados = Math.max(0, (comodinRow?.usados ?? 0) + delta);

  await supabase
    .from("comodines_mes")
    .upsert(
      { usuario_id: usuarioId, mes, usados: nuevoUsados },
      { onConflict: "usuario_id,mes", ignoreDuplicates: false },
    );
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

  const mes = primerDiaDelMes(fecha);
  if (esComodin) {
    const { data: comodinRow } = await supabase
      .from("comodines_mes")
      .select("usados")
      .eq("usuario_id", user.id)
      .eq("mes", mes)
      .maybeSingle();
    if ((comodinRow?.usados ?? 0) >= COMODINES_POR_MES) {
      return { ok: false, error: "Ya usaste tus 2 comodines de este mes." };
    }
  }

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({
      usuario_id: user.id,
      fecha_entrega: fechaEntrega,
      estado: "programado",
      platillo_id: platilloId,
      es_comodin: esComodin,
    })
    .select("id")
    .single();

  if (pedidoError || !pedido) {
    if ((pedidoError as { code?: string } | null)?.code === "23505") {
      return { ok: false, error: "Ya tienes una entrega asignada ese día." };
    }
    return { ok: false, error: "No se pudo asignar la entrega." };
  }

  const { error: movError } = await supabase.from("credito_movimientos").insert({
    usuario_id: user.id,
    cantidad: -1,
    tipo: "consumo",
    pedido_id: pedido.id,
  });
  if (movError) return { ok: false, error: "No se pudo descontar el crédito." };

  if (esComodin) {
    await ajustarComodinesMes(supabase, user.id, mes, 1);
  }

  revalidarCalendario();
  return { ok: true };
}

/**
 * Cancela una entrega dentro del plazo. El crédito regresa libre al
 * saldo (regla invariante) vía un movimiento +1 — nunca se edita el
 * movimiento de consumo original porque `credito_movimientos` es
 * append-only.
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
  // bloquea el UPDATE (falta policy `for update` en `pedidos`),
  // PostgREST no regresa error — regresa éxito con 0 filas afectadas.
  // Sin este chequeo el usuario ve "cancelado" en el toast pero al
  // recargar el calendario sigue exactamente igual, que es el bug que
  // se reportó. Ver la misma nota en `usuarios` (cuenta/actions.ts).
  const { data: canceladoRow, error: updateError } = await supabase
    .from("pedidos")
    .update({ estado: "cancelado" })
    .eq("id", pedidoId)
    .select("id")
    .maybeSingle();
  if (updateError) return { ok: false, error: "No se pudo cancelar." };
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
    pedido_id: pedidoId,
  });

  if (pedido.es_comodin) {
    const mes = primerDiaDelMes(new Date(`${pedido.fecha_entrega}T00:00:00`));
    await ajustarComodinesMes(supabase, user.id, mes, -1);
  }

  revalidarCalendario();
  return { ok: true };
}

/**
 * Cambia el platillo (o el estatus de comodín) de una entrega ya
 * asignada, sin tocar el saldo de créditos — el crédito ya se cobró
 * al asignar. Si el cambio cruza la frontera comodín ⇄ platillo fijo,
 * sí ajusta el contador de comodines del mes (antes no lo hacía: el
 * contador solo se tocaba en asignar/cancelar, así que editar un
 * pedido para volverlo comodín se saltaba el límite de 2/mes, y
 * volverlo a platillo fijo dejaba un comodín "perdido" para siempre).
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

  const mes = primerDiaDelMes(new Date(`${pedido.fecha_entrega}T00:00:00`));

  if (esComodin && !pedido.es_comodin) {
    const { data: comodinRow } = await supabase
      .from("comodines_mes")
      .select("usados")
      .eq("usuario_id", user.id)
      .eq("mes", mes)
      .maybeSingle();
    if ((comodinRow?.usados ?? 0) >= COMODINES_POR_MES) {
      return { ok: false, error: "Ya usaste tus 2 comodines de este mes." };
    }
  }

  const { data: editadoRow, error } = await supabase
    .from("pedidos")
    .update({ platillo_id: nuevoPlatilloId, es_comodin: esComodin })
    .eq("id", pedidoId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "No se pudo actualizar la entrega." };
  if (!editadoRow) {
    return {
      ok: false,
      error: "No se pudo actualizar: falta una política de acceso en la base de datos. Contacta soporte técnico.",
    };
  }

  if (esComodin && !pedido.es_comodin) {
    await ajustarComodinesMes(supabase, user.id, mes, 1);
  } else if (!esComodin && pedido.es_comodin) {
    await ajustarComodinesMes(supabase, user.id, mes, -1);
  }

  revalidarCalendario();
  return { ok: true };
}
