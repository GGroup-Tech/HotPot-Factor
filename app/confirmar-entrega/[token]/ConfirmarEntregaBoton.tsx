"use client";

import { useState, useTransition } from "react";
import { confirmarEntregaPorToken } from "../actions";

/**
 * Botón de confirmación para el repartidor — página pública sin
 * login, pensada para abrirse desde el link de WhatsApp en el
 * celular. Mismo patrón useTransition que el resto del panel admin,
 * pero con texto/tamaño pensado para tocar con el dedo, no clic de
 * mouse.
 */
export function ConfirmarEntregaBoton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; error?: string; yaEstaba?: boolean } | null>(null);

  if (resultado?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-success bg-success/10 px-6 py-8 text-center">
        <p className="text-[18px] font-medium text-success">
          {resultado.yaEstaba ? "Esta entrega ya estaba confirmada." : "¡Entrega confirmada!"}
        </p>
        <p className="text-[13px] text-muted">Ya puedes cerrar esta página.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await confirmarEntregaPorToken(token);
            setResultado(res);
          })
        }
        className="btn-primary w-full rounded-control py-4 text-[16px] font-medium disabled:opacity-40"
      >
        {pending ? "Confirmando…" : "Marcar como entregada"}
      </button>
      {resultado?.error && <p className="text-[13px] text-danger">{resultado.error}</p>}
    </div>
  );
}
