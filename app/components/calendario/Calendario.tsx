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
 * Tarjetas de 200×96px fijas (no flex-1) para calzar exacto con el
 * diseño — antes eran flexibles y el grid se veía "desfasado" contra
 * el mock.
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
            <div key={h} className="w-[200px] shrink-0 pl-1">
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
                <div key={j} className="h-[96px] w-[200px] shrink-0" />
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
