"use client";

import { useState, useTransition } from "react";
import { confirmarEntregaGrupo } from "../actions";

/**
 * Botón de confirmación para el repartidor — UNA parada de la ruta
 * (puede ser más de un pedido si comparten dirección, ej. roomies con
 * cuentas separadas). Página pública sin login, pensada para abrirse
 * desde el link de WhatsApp en el celular.
 *
 * Rediseñado 2026-08-19: antes confirmaba un pedido a la vez; ahora
 * confirma todo un grupo de un tap.
 */
export function ConfirmarEntregaBoton({
  token,
  pedidoIds,
  entregadoInicial,
}: {
  token: string;
  pedidoIds: string[];
  entregadoInicial: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; error?: string } | null>(
    entregadoInicial ? { ok: true } : null,
  );

  if (resultado?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-control border border-success bg-success/10 px-4 py-2.5">
        <p className="text-[13px] font-medium text-success">Entregado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await confirmarEntregaGrupo(token, pedidoIds);
            setResultado(res);
          })
        }
        className="btn-primary w-full rounded-control py-3 text-[14px] font-medium disabled:opacity-40"
      >
        {pending ? "Confirmando…" : "Marcar como entregado"}
      </button>
      {resultado?.error && <p className="text-[12px] text-danger">{resultado.error}</p>}
    </div>
  );
}
