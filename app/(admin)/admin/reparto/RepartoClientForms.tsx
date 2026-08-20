"use client";

import { useState, useTransition } from "react";
import { actualizarEstadoPedido, generarLinkConfirmacionPedido } from "../../actions";

/**
 * Botón de estado para un pedido en Reparto — mismo patrón
 * (useTransition + error visible) que `GastoPagadoBoton` en
 * `admin/finanzas/FinanzasClientForms.tsx`.
 *
 * Un pedido "programado" o "en_produccion" muestra "Marcar entregado".
 * Uno ya "entregado" muestra la pill verde con un "Deshacer" chiquito
 * al lado, por si se marcó por error — no hay confirmación de por
 * medio a propósito (es una acción de todos los días, en el momento
 * de la entrega, no algo destructivo que amerite un modal).
 */
export function EstadoPedidoBoton({ pedidoId, estado }: { pedidoId: string; estado: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [estadoLocal, setEstadoLocal] = useState(estado);

  function cambiar(nuevoEstado: string) {
    setError(null);
    startTransition(async () => {
      const res = await actualizarEstadoPedido(pedidoId, nuevoEstado);
      if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
      else setEstadoLocal(nuevoEstado);
    });
  }

  if (estadoLocal === "entregado") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="pill border border-success text-success">Entregado</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => cambiar("programado")}
            className="text-[11px] text-muted hover:text-cream disabled:opacity-40"
          >
            {pending ? "…" : "Deshacer"}
          </button>
        </div>
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => cambiar("entregado")}
        className="btn-secondary rounded-control px-3 py-[7px] text-[12px] disabled:opacity-40"
      >
        {pending ? "…" : "Marcar entregado"}
      </button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * Puente manual mientras no está listo el envío automático por
 * WhatsApp (Fase 2, requiere Twilio) — genera el link público de
 * confirmación (`/confirmar-entrega/[token]`) y lo copia al
 * portapapeles para que el staff lo pegue a mano en el chat de
 * WhatsApp con el repartidor.
 */
export function LinkConfirmacionBoton({ pedidoId }: { pedidoId: string }) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<"idle" | "copiado" | "error">("idle");

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await generarLinkConfirmacionPedido(pedidoId);
            if (!res.ok || !res.url) {
              setEstado("error");
              return;
            }
            try {
              await navigator.clipboard.writeText(res.url);
              setEstado("copiado");
            } catch {
              setEstado("error");
            }
          })
        }
        className="text-[11px] text-muted hover:text-cream disabled:opacity-40"
      >
        {pending ? "…" : estado === "copiado" ? "Link copiado ✓" : "Copiar link para repartidor"}
      </button>
      {estado === "error" && <p className="text-[11px] text-danger">No se pudo generar/copiar el link.</p>}
    </div>
  );
}
