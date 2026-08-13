import "server-only";

import Stripe from "stripe";

/**
 * Server-only Stripe client. STRIPE_SECRET_KEY is never exposed to the
 * browser (no NEXT_PUBLIC_ prefix). The client is optional at import
 * time because the client hasn't provisioned Stripe yet — callers must
 * check `isStripeConfigured()` and show a friendly "en configuración"
 * state instead of crashing the build.
 */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada todavía. El cliente debe proporcionar sus llaves de Stripe.",
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}
