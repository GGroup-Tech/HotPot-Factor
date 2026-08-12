"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { asignarPedido, cancelarPedido, editarPedido } from "./actions";

export interface DiaCeldaData {
  fecha: string; // 'YYYY-MM-DD'
  numero: number;
  editable: boolean; // false si está dentro de las 48h de corte
  platilloFijo: { id: string; nombre: string } | null;
  pedido: {
    id: string;
    platilloId: string;
    platilloNombre: string;
    esComodin: boolean;
  } | null;
}

export function DiaCelda({
  dia,
  comodinesDisponibles,
  platillosComodin,
}: {
  dia: DiaCeldaData;
  comodinesDisponibles: number;
  platillosComodin: { id: string; nombre: string }[];
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const asignado = Boolean(dia.pedido);

  function cerrar() {
    setMenuAbierto(false);
    setError(null);
  }

  function onAsignar(platilloId: string, esComodin: boolean) {
    startTransition(async () => {
      const res = await asignarPedido(dia.fecha, platilloId, esComodin);
      if (!res.ok) setError(res.error ?? "Error");
      else cerrar();
    });
  }

  function onCancelar() {
    if (!dia.pedido) return;
    startTransition(async () => {
      const res = await cancelarPedido(dia.pedido!.id);
      if (!res.ok) setError(res.error ?? "Error");
      else cerrar();
    });
  }

  function onEditar(platilloId: string, esComodin: boolean) {
    if (!dia.pedido) return;
    startTransition(async () => {
      const res = await editarPedido(dia.pedido!.id, platilloId, esComodin);
      if (!res.ok) setError(res.error ?? "Error");
      else cerrar();
    });
  }

  const nombreMostrado = dia.pedido?.platilloNombre ?? dia.platilloFijo?.nombre ?? "—";

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!dia.editable}
        onClick={() => dia.editable && setMenuAbierto((o) => !o)}
        className={clsx(
          "flex h-[112px] w-full min-w-[140px] flex-1 flex-col items-start gap-2 rounded-card-sm border px-[14px] py-3 text-left transition-colors",
          !dia.editable && "cursor-not-allowed border-disabled bg-ink",
          dia.editable && asignado && "border-[1.5px] border-gold bg-raised",
          dia.editable && !asignado && "border-line bg-surface hover:border-gold/50",
        )}
      >
        <div className="flex w-full items-center justify-between">
          <p className={clsx("text-[17px] font-medium", !dia.editable ? "text-disabled" : asignado ? "text-cream" : "text-muted")}>
            {dia.numero}
          </p>
          {asignado && dia.editable && <span className="size-2 rounded-full bg-gold" />}
        </div>
        <p
          className={clsx(
            "line-clamp-2 text-[13px] leading-[19px]",
            !dia.editable ? "text-disabled" : asignado ? "text-cream" : "text-muted",
          )}
        >
          {nombreMostrado}
        </p>
        {dia.editable && asignado && (
          <p className="text-[12px] font-medium text-gold">1 crédito</p>
        )}
        {dia.pedido?.esComodin && (
          <span className="badge">COMODÍN</span>
        )}
        {!dia.editable && (
          <span className="rounded-badge border border-disabled px-2 py-1 text-[9px] font-medium uppercase tracking-[0.72px] text-disabled">
            CERRADO
          </span>
        )}
      </button>

      {menuAbierto && (
        <div className="absolute left-0 top-[118px] z-20 w-[240px] rounded-card border border-line bg-raised p-3 shadow-xl">
          {error && <p className="mb-2 text-[12px] text-danger">{error}</p>}
          {!asignado && dia.platilloFijo && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onAsignar(dia.platilloFijo!.id, false)}
              className="btn-primary w-full rounded-control py-2 text-[13px]"
            >
              Asignar {dia.platilloFijo.nombre}
            </button>
          )}
          {!asignado && comodinesDisponibles > 0 && platillosComodin.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-[11px] text-muted">O usa un comodín ({comodinesDisponibles} disponibles):</p>
              {platillosComodin.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={pending}
                  onClick={() => onAsignar(p.id, true)}
                  className="pill w-full justify-center text-[12px]"
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          )}
          {asignado && (
            <div className="flex flex-col gap-1.5">
              <p className="px-1 text-[11px] uppercase tracking-[0.6px] text-muted">Editar</p>
              {dia.platilloFijo && dia.pedido?.esComodin && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onEditar(dia.platilloFijo!.id, false)}
                  className="btn-secondary w-full rounded-control py-2 text-[13px]"
                >
                  Cambiar a {dia.platilloFijo.nombre}
                </button>
              )}
              {platillosComodin
                .filter((p) => p.id !== dia.pedido?.platilloId)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={pending}
                    onClick={() => onEditar(p.id, true)}
                    className="btn-secondary w-full rounded-control py-2 text-[13px]"
                  >
                    Usar comodín: {p.nombre}
                  </button>
                ))}
              <button
                type="button"
                disabled={pending}
                onClick={onCancelar}
                className="mt-1 w-full rounded-control border border-danger/40 py-2 text-[13px] text-danger hover:bg-danger/10"
              >
                Cancelar entrega
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={cerrar}
            className="mt-2 w-full text-center text-[11px] text-muted hover:text-cream"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
