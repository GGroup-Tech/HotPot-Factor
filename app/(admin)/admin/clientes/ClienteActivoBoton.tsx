"use client";

import { useState, useTransition } from "react";
import { alternarClienteActivo } from "../../actions";

/**
 * Antes no existía forma de marcar que un cliente se dio de baja —
 * `usuarios.activo` no tenía ningún control que lo escribiera. Se
 * agregó 2026-08-13 principalmente para que el cálculo de churn en
 * Finanzas tenga datos reales en vez de "no disponible".
 */
export function ClienteActivoBoton({ usuarioId, activo }: { usuarioId: string; activo: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await alternarClienteActivo(usuarioId, !activo);
            if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
          })
        }
        className={`pill border ${activo ? "border-success text-success" : "border-line text-muted"}`}
      >
        {pending ? "…" : activo ? "Activo" : "Inactivo"}
      </button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
