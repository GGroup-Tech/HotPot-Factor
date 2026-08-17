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
      monto_mxn: (paymentIntent.amount_received ?? paymentIntent.amount) / 100,
      stripe_payment_intent_id: paymentIntent.id,
    })
    .select()
    .single();

  if (compraError) {
    console.error("compras insert failed", compraError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // credito_movimientos is append-only: insert only, never update/delete.
  // Corregido 2026-08-17: la columna real es `referencia_id` (no
  // `compra_id`) y `notas` (no `nota`) — con los nombres viejos este
  // insert fallaba SIEMPRE con PGRST204, así que cada pago exitoso de
  // Stripe creaba la fila en `compras` pero nunca otorgaba el crédito.
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
