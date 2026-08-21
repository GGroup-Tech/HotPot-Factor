import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Creates a Stripe PaymentIntent for a package purchase (pantalla 03 —
 * Pago). The client_secret is consumed by Stripe Elements on the
 * frontend; NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is the only Stripe key
 * that ever reaches the browser.
 *
 * `idempotencyKey` agregada 2026-08-21 — el usuario preguntó si un
 * doble clic en "Pagar" cobra doble. La respuesta corta era que no
 * (un solo PaymentIntent por carga de pantalla, y Stripe ya bloquea
 * confirmar dos veces el mismo), pero SÍ había un hueco real distinto:
 * esta llamada no tenía idempotency key, así que dos peticiones a
 * `/api/checkout` para el mismo usuario+paquete (dos pestañas
 * abiertas, un refresh, o un reintento automático de red) creaban DOS
 * PaymentIntents distintos — dos cobros posibles de verdad.
 *
 * La clave se arma con usuario+paquete+una ventana de 10 minutos, así
 * que peticiones repetidas en ese lapso reciben el MISMO PaymentIntent
 * (Stripe lo cachea por idempotency key, no cobra ni lo crea de
 * nuevo), pero una compra genuina más tarde (fuera de esa ventana)
 * sigue generando un PaymentIntent nuevo sin problema — no bloquea que
 * alguien compre el mismo paquete otra vez en el futuro.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Pagos no disponibles todavía. Configura STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { paqueteId } = await request.json();

  const { data: paquete, error } = await supabase
    .from("paquetes")
    .select("id, nombre, creditos, precio_mxn, activo")
    .eq("id", paqueteId)
    .eq("activo", true)
    .single();

  if (error || !paquete) {
    return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
  }

  const ventanaDe10Min = Math.floor(Date.now() / (10 * 60 * 1000));
  const idempotencyKey = `checkout:${user.id}:${paquete.id}:${ventanaDe10Min}`;

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: Math.round(paquete.precio_mxn * 100),
      currency: "mxn",
      metadata: {
        usuario_id: user.id,
        paquete_id: paquete.id,
        creditos: String(paquete.creditos),
      },
    },
    { idempotencyKey },
  );

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
