"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarClienteEntrega } from "@/lib/notificaciones";

export interface ConfirmarEntregaResult {
  ok: boolean;
  error?: string;
}

/**
 * Confirma un GRUPO de entregas (todas las que comparten dirección
 * en la ruta del día) vía el token público del día — Fase 1 del
 * proyecto de ruteo óptimo + WhatsApp al repartidor (backlog #55).
 * Rediseñado 2026-08-19: antes era un pedido a la vez; ahora el
 * repartidor confirma toda una parada (que puede tener más de un
 * pedido — dos clientes distintos, roomies, compartiendo domicilio)
 * de un solo tap.
 *
 * A propósito NO llama `requireStaff()`: el repartidor no tiene (ni
 * necesita) cuenta de staff, el token ES la autorización — igual que
 * el webhook de Stripe, usa el cliente admin (service role) directo.
 *
 * Revalida cada `pedidoId` contra el token recibido antes de tocar
 * nada (defensa contra que alguien arme un array de ids a mano) —
 * solo actualiza los que de verdad tienen ESE token y siguen
 * pendientes. Solo puede llevar un pedido a "entregado", nunca a otro
 * estado — si algo salió mal con una entrega, eso se resuelve a mano
 * desde Reparto en el panel admin.
 */
export async function confirmarEntregaGrupo(token: string, pedidoIds: string[]): Promise<ConfirmarEntregaResult> {
  if (!token || token.trim().length === 0 || pedidoIds.length === 0) {
    return { ok: false, error: "Link inválido." };
  }

  const admin = createAdminClient();

  const { data: pedidos, error: fetchError } = await admin
    .from("pedidos")
    .select("id, estado, token_confirmacion, token_expira_en, usuario_id, usuarios(nombre, telefono), platillos(nombre)")
    .in("id", pedidoIds);

  if (fetchError || !pedidos || pedidos.length === 0) {
    return { ok: false, error: "Este link no es válido." };
  }

  // Solo los que de verdad pertenecen a este token, no están
  // cancelados, y el link sigue vigente.
  const validos = pedidos.filter(
    (p) =>
      p.token_confirmacion === token &&
      p.token_expira_en &&
      new Date(p.token_expira_en) > new Date() &&
      p.estado !== "cancelado",
  );

  if (validos.length === 0) {
    return { ok: false, error: "Este link ya venció o los pedidos ya no están vigentes." };
  }

  const pendientes = validos.filter((p) => p.estado !== "entregado");
  if (pendientes.length > 0) {
    const { error: updateError } = await admin
      .from("pedidos")
      .update({ estado: "entregado" })
      .in(
        "id",
        pendientes.map((p) => p.id),
      );
    if (updateError) return { ok: false, error: "No se pudo confirmar la entrega. Intenta de nuevo." };
  }

  // Notificación al cliente — no bloqueante (ver lib/notificaciones.ts,
  // sigue siendo un stub hasta que Twilio esté conectado). Una por
  // pedido: si dos roomies comparten dirección, cada quien recibe la
  // suya, no una notificación compartida.
  for (const p of pendientes) {
    const usuario = p.usuarios as unknown as { nombre: string; telefono: string | null } | null;
    const platillo = p.platillos as unknown as { nombre: string } | null;
    await notificarClienteEntrega({
      telefono: usuario?.telefono ?? null,
      nombre: usuario?.nombre ?? "Cliente",
      platillo: platillo?.nombre ?? "tu pedido",
    });
  }

  revalidatePath("/admin/reparto");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");

  return { ok: true };
}
