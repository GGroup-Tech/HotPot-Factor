"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ConfirmarEntregaResult {
  ok: boolean;
  error?: string;
  yaEstaba?: boolean;
}

/**
 * Confirma una entrega vía el token público del pedido — Fase 1 del
 * proyecto de ruteo óptimo + WhatsApp al repartidor (backlog #55).
 * A propósito NO llama `requireStaff()`: el repartidor no tiene (ni
 * necesita) cuenta de staff, el token ES la autorización — por eso
 * usa el cliente admin (service role) directo, igual que el webhook
 * de Stripe.
 *
 * Solo puede llevar un pedido a "entregado", nunca a otro estado —
 * si algo salió mal con una entrega (cliente no estaba, dirección
 * incorrecta, etc.), eso se resuelve a mano desde Reparto en el panel
 * admin, no desde este link público. No hay "estado de entrega
 * fallida" en el esquema real (`PedidoEstado` es programado |
 * en_produccion | entregado | cancelado), así que no se inventa uno
 * aquí.
 */
export async function confirmarEntregaPorToken(token: string): Promise<ConfirmarEntregaResult> {
  if (!token || token.trim().length === 0) {
    return { ok: false, error: "Link inválido." };
  }

  const admin = createAdminClient();

  const { data: pedido, error: fetchError } = await admin
    .from("pedidos")
    .select("id, estado, token_expira_en")
    .eq("token_confirmacion", token)
    .maybeSingle();

  if (fetchError || !pedido) {
    return { ok: false, error: "Este link no es válido." };
  }

  if (pedido.token_expira_en && new Date(pedido.token_expira_en) < new Date()) {
    return { ok: false, error: "Este link ya venció." };
  }

  if (pedido.estado === "cancelado") {
    return { ok: false, error: "Este pedido fue cancelado, no se puede confirmar como entregado." };
  }

  if (pedido.estado === "entregado") {
    return { ok: true, yaEstaba: true };
  }

  const { error: updateError } = await admin.from("pedidos").update({ estado: "entregado" }).eq("id", pedido.id);
  if (updateError) {
    return { ok: false, error: "No se pudo confirmar la entrega. Intenta de nuevo." };
  }

  revalidatePath("/admin/reparto");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");

  return { ok: true };
}
