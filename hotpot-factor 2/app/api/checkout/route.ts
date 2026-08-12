import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Creates a Stripe PaymentIntent for a package purchase (pantalla 03 —
 * Pago). The client_secret is consumed by Stripe Elements on the
 * frontend; NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is the only Stripe key
 * that ever reaches the browser.
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

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(paquete.precio_mxn * 100),
    currency: "mxn",
    metadata: {
      usuario_id: user.id,
      paquete_id: paquete.id,
      creditos: String(paquete.creditos),
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
