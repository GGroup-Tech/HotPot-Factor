import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const runtime = "nodejs";

/**
 * Idempotent Stripe webhook.
 *
 * Idempotency comes from `pagos_procesados` having `payment_ref` as its
 * PRIMARY KEY (confirmado 2026-08-19 vía information_schema +
 * table_constraints): every handler path does an `insert(...)` against
 * that table FIRST, and treats a unique-violation as "already handled,
 * no-op" — Stripe retries the same event on any non-2xx response, so
 * this must be safe to run more than once for the same payment.
 *
 * Corregido 2026-08-19 (segunda vuelta — primer intento de compra de
 * prueba real): el insert a `pagos_procesados` usaba columnas que NO
 * EXISTEN (`payment_intent_id`, y un update posterior a `compra_id`,
 * que tampoco existe). Esquema real confirmado vía SQL:
 * `pagos_procesados(payment_ref PK NOT NULL, usuario_id FK NOT NULL,
 * monto_mxn NOT NULL, procesado_en)` — es decir, esta tabla es solo un
 * log plano de idempotencia (pago ya visto sí/no), sin relación hacia
 * `compras`. Por eso el claim ahora necesita `usuario_id`/`monto_mxn`
 * desde el arranque, así que la metadata del PaymentIntent se lee
 * ANTES del insert de claim (antes se leía después). También se quitó
 * el `update` final a `pagos_procesados` — no hay columna que
 * actualizar; una vez insertado el claim, ya no hace falta tocarlo.
 *
 * Fix previo (mismo día, primera vuelta): el insert a `compras` usaba
 * `stripe_payment_intent_id` (columna que NO EXISTE — el nombre real
 * es `payment_ref`) y nunca mandaba `creditos`, que es NOT NULL en la
 * base real. Ese fix sigue vigente abajo.
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

  const usuarioId = paymentIntent.metadata?.usuario_id;
  const paqueteId = paymentIntent.metadata?.paquete_id;
  const creditos = Number(paymentIntent.metadata?.creditos ?? 0);
  const montoMxn = (paymentIntent.amount_received ?? paymentIntent.amount) / 100;

  if (!usuarioId || !paqueteId || !creditos) {
    console.error("payment_intent missing required metadata", paymentIntent.id);
    return NextResponse.json({ error: "missing metadata" }, { status: 400 });
  }

  // Claim the payment_ref first. If it's already there, another webhook
  // delivery (or a Stripe retry) already processed it — stop here.
  const { error: claimError } = await admin.from("pagos_procesados").insert({
    payment_ref: paymentIntent.id,
    usuario_id: usuarioId,
    monto_mxn: montoMxn,
  });

  if (claimError) {
    // Postgres unique_violation = 23505
    if ((claimError as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error("pagos_procesados insert failed", claimError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { data: compra, error: compraError } = await admin
    .from("compras")
    .insert({
      usuario_id: usuarioId,
      paquete_id: paqueteId,
      creditos,
      monto_mxn: montoMxn,
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

  return NextResponse.json({ received: true });
}
