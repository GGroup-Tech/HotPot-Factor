"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { Button } from "@/app/components/ui/Button";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<StripeJs | null> | null = null;
if (publishableKey) {
  stripePromise = loadStripe(publishableKey);
}

function PagoInner({ paqueteId, totalLabel }: { paqueteId: string; totalLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/arma-tu-mes?paquete=${paqueteId}`,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "No se pudo procesar el pago.");
      setSubmitting(false);
    } else {
      router.push(`/arma-tu-mes?paquete=${paqueteId}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-6">
      <PaymentElement />
      {error && <p className="text-[14px] text-danger">{error}</p>}
      <Button type="submit" disabled={!stripe || submitting} className="w-full py-[17px] text-[17px]">
        {submitting ? "Procesando…" : `Pagar ${totalLabel}`}
      </Button>
      <p className="w-[560px] text-[13px] leading-[21px] text-muted">
        Al pagar aceptas los términos y condiciones. Los créditos no vencen y no son reembolsables en efectivo.
      </p>
    </form>
  );
}

export function PagoForm({ paqueteId, totalLabel }: { paqueteId: string; totalLabel: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripePromise || !paqueteId) return;
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paqueteId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setError(data.error ?? "No se pudo iniciar el pago.");
      })
      .catch(() => setError("No se pudo iniciar el pago."));
  }, [paqueteId]);

  if (!stripePromise) {
    return (
      <div className="flex w-full flex-col gap-4 rounded-card-sm border border-line bg-surface px-6 py-8">
        <p className="text-[15px] text-cream">
          Los pagos todavía no están activos: falta que el cliente conecte su cuenta de Stripe
          (<code className="text-gold">STRIPE_SECRET_KEY</code>,{" "}
          <code className="text-gold">STRIPE_WEBHOOK_SECRET</code>,{" "}
          <code className="text-gold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>).
        </p>
        <p className="text-[13px] text-muted">
          El formulario de pago se activa automáticamente en cuanto esas variables existan — no hace
          falta tocar código.
        </p>
      </div>
    );
  }

  if (error) {
    return <p className="text-[14px] text-danger">{error}</p>;
  }

  if (!clientSecret) {
    return <p className="text-[14px] text-muted">Preparando el pago…</p>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#C9A15C" } } }}
    >
      <PagoInner paqueteId={paqueteId} totalLabel={totalLabel} />
    </Elements>
  );
}
