"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUsuario } from "@/lib/supabase/staff";
import { puedeEditarPedido, COMODINES_POR_MES } from "@/lib/creditos";

export interface AccionPedidoResult {
  ok: boolean;
  error?: string;
}

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
    await supabase
      .from("comodines_mes")
      .upsert(
        { usuario_id: user.id, mes, usados: 1 },
        { onConflict: "usuario_id,mes", ignoreDuplicates: false },
      );
    // Nota: el upsert de arriba asume que el cliente maneja el
    // incremento vía trigger/RPC (`usados = usados + 1`); si no existe
    // ese trigger, reemplazar por un RPC dedicado antes de producción.
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

  const { error: updateError } = await supabase
    .from("pedidos")
    .update({ estado: "cancelado" })
    .eq("id", pedidoId);
  if (updateError) return { ok: false, error: "No se pudo cancelar." };

  await supabase.from("credito_movimientos").insert({
    usuario_id: user.id,
    cantidad: 1,
    tipo: "cancelacion",
    pedido_id: pedidoId,
  });

  if (pedido.es_comodin) {
    const mes = primerDiaDelMes(new Date(`${pedido.fecha_entrega}T00:00:00`));
    await supabase.rpc("liberar_comodin", { p_usuario_id: user.id, p_mes: mes }).select();
    // Nota: requiere un RPC `liberar_comodin` que decremente
    // `comodines_mes.usados` sin bajar de 0. Si no existe todavía,
    // crearlo en Supabase antes de producción.
  }

  revalidarCalendario();
  return { ok: true };
}

/**
 * Cambia el platillo (o el estatus de comodín) de una entrega ya
 * asignada, sin tocar el saldo de créditos — el crédito ya se cobró
 * al asignar.
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
    .select("id, usuario_id, fecha_entrega")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.usuario_id !== user.id) {
    return { ok: false, error: "Entrega no encontrada." };
  }
  if (!puedeEditarPedido(new Date(`${pedido.fecha_entrega}T00:00:00`))) {
    return { ok: false, error: "Esta entrega ya está dentro de las 48 horas de corte." };
  }

  const { error } = await supabase
    .from("pedidos")
    .update({ platillo_id: nuevoPlatilloId, es_comodin: esComodin })
    .eq("id", pedidoId);

  if (error) return { ok: false, error: "No se pudo actualizar la entrega." };

  revalidarCalendario();
  return { ok: true };
}
