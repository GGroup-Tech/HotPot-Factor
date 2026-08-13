"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import type { DiaCeldaData } from "@/lib/calendario";
import { asignarPedido, cancelarPedido, editarPedido } from "./actions";

export type { DiaCeldaData };

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
  const hayComodinesUsables = comodinesDisponibles > 0 && platillosComodin.length > 0;
  // Día editable (fuera de las 48h de corte) pero sin nada que asignar
  // todavía: ni menú fijo publicado para ese día de la semana, ni
  // comodines disponibles. Antes esto se veía igual que un día vacío
  // normal (solo un "—"), lo cual se leía como un bug — ahora se marca
  // explícitamente como "por confirmar" en vez de dejarlo en blanco.
  const sinOpciones = !asignado && !dia.platilloFijo && !hayComodinesUsables;

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

  const clicable = dia.editable && !sinOpciones;
  const nombreMostrado = dia.pedido?.platilloNombre ?? dia.platilloFijo?.nombre ?? null;

  return (
    <div className="relative min-w-[200px] flex-1">
      <button
        type="button"
        disabled={!clicable}
        onClick={() => clicable && setMenuAbierto((o) => !o)}
        className={clsx(
          "flex h-[96px] w-full flex-col items-start gap-1.5 rounded-card-sm border px-3 py-2.5 text-left transition-colors",
          !dia.editable && "cursor-not-allowed border-disabled bg-surface",
          dia.editable && sinOpciones && "cursor-default border-dashed border-line/70 bg-transparent",
          dia.editable && !sinOpciones && asignado && "border-[1.5px] border-gold bg-raised",
          dia.editable && !sinOpciones && !asignado && "border-line bg-surface hover:border-gold/50",
        )}
      >
        <div className="flex w-full items-center justify-between">
          <p
            className={clsx(
              "text-[16px] font-medium",
              !dia.editable ? "text-disabled" : sinOpciones ? "text-muted" : asignado ? "text-cream" : "text-muted",
            )}
          >
            {dia.numero}
          </p>
          {!dia.editable && (
            <span className="rounded-[4px] border border-disabled px-[7px] py-[3px] text-[8px] font-medium uppercase tracking-[0.48px] text-disabled">
              CERRADO
            </span>
          )}
          {dia.editable && asignado && <span className="size-3 shrink-0 rounded-full bg-gold" />}
        </div>
        {nombreMostrado ? (
          <p
            className={clsx(
              "line-clamp-2 text-[12px] leading-4",
              !dia.editable ? "text-disabled" : asignado ? "text-cream" : "text-muted",
            )}
          >
            {nombreMostrado}
          </p>
        ) : dia.editable && sinOpciones ? (
          <p className="text-[12px] italic leading-4 text-muted/70">Menú por confirmar</p>
        ) : null}
        {dia.editable && asignado && dia.pedido?.esComodin && (
          <span className="rounded-[4px] bg-gold px-[7px] py-[3px] text-[8px] font-medium uppercase tracking-[0.48px] text-ink">
            COMODÍN
          </span>
        )}
        {dia.editable && asignado && !dia.pedido?.esComodin && (
          <span className="rounded-[6px] border border-line px-2.5 py-1 text-[11px] text-cream">Editar</span>
        )}
      </button>

      {menuAbierto && (
        <div className="absolute left-0 top-[102px] z-20 w-[240px] rounded-card border border-line bg-raised p-3 shadow-xl">
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
          {!asignado && hayComodinesUsables && (
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
