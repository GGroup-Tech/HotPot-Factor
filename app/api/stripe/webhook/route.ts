import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const runtime = "nodejs";

/**
 * Idempotent Stripe webhook.
 *
 * Idempotency comes from `pagos_procesados` having `payment_intent_id`
 * as its PRIMARY KEY: every handler path does an
 * `insert(...).select()` against that table FIRST, and treats a
 * unique-violation as "already handled, no-op" — Stripe retries the
 * same event on any non-2xx response, so this must be safe to run
 * more than once for the same payment_intent_id.
 *
 * Corregido 2026-08-19 (auditoría de Finanzas): el insert a `compras`
 * usaba `stripe_payment_intent_id` (columna que NO EXISTE — el nombre
 * real es `payment_ref`) y nunca mandaba `creditos`, que es NOT NULL
 * en la base real. Ambos hacían que el insert a `compras` fallara
 * SIEMPRE, en cada pago exitoso de Stripe — es decir, el cliente
 * quedaba cobrado pero nunca recibía sus créditos, sin ningún error
 * visible más que un log en el servidor. Esquema real confirmado
 * 2026-08-19 vía information_schema.columns:
 * `compras(id, usuario_id, paquete_id NOT NULL, creditos NOT NULL,
 * monto_mxn NOT NULL, cupon_id, descuento_mxn, payment_ref NOT NULL,
 * creado_en)`.
 *
 * IMPORTANTE si ya intentaste una compra de prueba antes de este fix:
 * el primer insert a `pagos_procesados` (el "claim" de idempotencia)
 * SÍ se alcanza a guardar antes de que el insert a `compras` fallara,
 * así que puede haber quedado un renglón en `pagos_procesados` con
 * `compra_id` en null para ese `payment_intent_id`. Mientras exista,
 * un reintento de Stripe para ese mismo pago se deduplica y JAMÁS
 * vuelve a intentar el insert, aunque el código ya esté arreglado.
 * Bórralo con:
 *   delete from pagos_procesados where compra_id is null;
 * antes de volver a probar un pago.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    // Keep the route live (200) so Stripe doesn't disable the endpoint
    // once it's finally configured — but do nothing until then.
    return NextResponse.json(
      { received: false, reason: "stripe-not-configured" },
      { status: 200 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const admin = createAdminClient();

  // Claim the payment_intent_id first. If it's already there, another
  // webhook delivery (or a retry) already processed it — stop here.
  const { error: claimError } = await admin
    .from("pagos_procesados")
    .insert({ payment_intent_id: paymentIntent.id });

  if (claimError) {
    // Postgres unique_violation = 23505
    if ((claimError as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error("pagos_procesados insert failed", claimError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const usuarioId = paymentIntent.metadata?.usuario_id;
  const paqueteId = paymentIntent.metadata?.paquete_id;
  const creditos = Number(paymentIntent.metadata?.creditos ?? 0);

  if (!usuarioId || !paqueteId || !creditos) {
    console.error("payment_intent missing required metadata", paymentIntent.id);
    return NextResponse.json({ error: "missing metadata" }, { status: 400 });
  }

  const { data: compra, error: compraError } = await admin
    .from("compras")
    .insert({
      usuario_id: usuarioId,
      paquete_id: paqueteId,
      creditos,
      monto_mxn: (paymentIntent.amount_received ?? paymentIntent.amount) / 100,
      payment_ref: paymentIntent.id,
    })
    .select()
    .single();

  if (compraError) {
    console.error("compras insert failed", compraError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // credito_movimientos is append-only: insert only, never update/delete.
  // La columna real es `referencia_id` (no `compra_id`) y `notas` (no
  // `nota`) — confirmado 2026-08-17.
  const { error: movError } = await admin.from("credito_movimientos").insert({
    usuario_id: usuarioId,
    cantidad: creditos,
    tipo: "compra",
    referencia_id: compra.id,
    notas: `Compra de paquete ${paqueteId} via Stripe`,
  });

  if (movError) {
    console.error("credito_movimientos insert failed", movError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  await admin
    .from("pagos_procesados")
    .update({ compra_id: compra.id })
    .eq("payment_intent_id", paymentIntent.id);

  return NextResponse.json({ received: true });
}
