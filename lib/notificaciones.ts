/**
 * Notificaciones al cliente por WhatsApp — Fase 1 del proyecto de
 * ruteo óptimo + WhatsApp al repartidor (backlog #55). Mismo patrón
 * no-bloqueante que `lib/geocoding.ts`: mientras no exista una cuenta
 * de Twilio configurada, esto solo deja un log y regresa — nunca
 * tira la confirmación de entrega si la notificación falla o no está
 * lista todavía.
 *
 * Cuando conectemos Twilio (Fase 2), aquí es donde se manda la
 * plantilla de WhatsApp aprobada tipo "Tu pedido de {platillo} ya fue
 * entregado" — necesita su propia plantilla aprobada por Meta,
 * separada de la que manda la ruta al repartidor (son conversaciones
 * distintas, con destinatarios distintos).
 */
export async function notificarClienteEntrega(params: {
  telefono: string | null;
  nombre: string;
  platillo: string;
}): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("notificarClienteEntrega: Twilio no configurado todavía — no se envía notificación.", {
      nombre: params.nombre,
      platillo: params.platillo,
    });
    return;
  }
  if (!params.telefono) {
    console.warn("notificarClienteEntrega: cliente sin teléfono capturado, no se puede notificar.", {
      nombre: params.nombre,
    });
    return;
  }

  // TODO (Fase 2, requiere Twilio con WhatsApp aprobado): mandar la
  // plantilla "pedido_entregado" al número de `params.telefono`.
  console.warn("notificarClienteEntrega: Twilio configurado pero el envío real todavía no está implementado.", params);
}
