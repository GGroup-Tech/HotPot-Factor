"use client";

import { DiaCelda } from "./DiaCelda";
import type { DiaCeldaData } from "@/lib/calendario";
import { DIAS_SEMANA_LARGO } from "@/lib/calendario";

/**
 * Calendario — Figma node 180:2 ("08 — Mi calendario"). Recibe semanas
 * ya armadas (5 columnas lun-vie; `null` en los huecos de la
 * primera/última semana) para no meter lógica de fechas en el
 * cliente. Compartido entre el flujo de compra (`/arma-tu-mes`) y el
 * panel de cliente (`/cuenta/calendario`).
 *
 * Tarjetas de 96px de alto fijo, pero de ancho fluido (`flex-1
 * min-w-[200px]`, decisión explícita del usuario 2026-08-13): 200px es
 * el piso que calza con el mock de Figma, pero en monitores anchos las
 * 5 columnas se reparten el ancho completo disponible en vez de dejar
 * espacio muerto a la derecha. (Antes eran `w-[200px]` fijas a secas;
 * eso fue una corrección anterior para un desfase visual puntual, no
 * un requisito de que fueran literalmente 200px siempre.)
 */
export function Calendario({
  semanas,
  comodinesDisponibles,
  platillosComodin,
}: {
  semanas: (DiaCeldaData | null)[][];
  comodinesDisponibles: number;
  platillosComodin: { id: string; nombre: string }[];
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex w-fit min-w-full flex-col gap-2.5">
        <div className="flex gap-3">
          {DIAS_SEMANA_LARGO.map((h) => (
            <div key={h} className="min-w-[200px] flex-1 pl-1">
              <p className="text-[10px] font-medium tracking-[0.8px] text-muted">{h}</p>
            </div>
          ))}
        </div>
        {semanas.map((semana, i) => (
          <div key={i} className="flex gap-3">
            {semana.map((dia, j) =>
              dia ? (
                <DiaCelda
                  key={dia.fecha}
                  dia={dia}
                  comodinesDisponibles={comodinesDisponibles}
                  platillosComodin={platillosComodin}
                />
              ) : (
                <div key={j} className="h-[96px] min-w-[200px] flex-1" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Leyenda de colores — Figma la coloca junto al selector de mes, arriba del "Menú" y el header de días. */
export function CalendarioLeyenda() {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <LeyendaItem color="border border-gold bg-gold" label="Elegido" />
      <LeyendaItem color="border border-gold bg-surface" label="Comodín" />
      <LeyendaItem color="border border-line bg-surface" label="Disponible" />
      <LeyendaItem color="border border-disabled bg-surface" label="Cerrado" />
    </div>
  );
}

function LeyendaItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-[14px] rounded-[4px] ${color}`} />
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  );
}
