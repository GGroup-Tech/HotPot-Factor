"use client";

import { DiaCelda, type DiaCeldaData } from "./DiaCelda";

const ENCABEZADOS = ["LUN", "MAR", "MIÉ", "JUE", "VIE"];

/**
 * Calendario — Figma node 108:65. Recibe semanas ya armadas (5
 * columnas lun-vie; `null` en los huecos de la primera/última
 * semana) para no meter lógica de fechas en el cliente.
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
    <div className="flex w-full min-w-[700px] flex-col gap-3">
      <div className="flex w-full gap-3">
        {ENCABEZADOS.map((h) => (
          <div key={h} className="flex-1 pl-1">
            <p className="text-[10px] font-medium tracking-[0.8px] text-muted">{h}</p>
          </div>
        ))}
      </div>
      {semanas.map((semana, i) => (
        <div key={i} className="flex w-full gap-3">
          {semana.map((dia, j) =>
            dia ? (
              <DiaCelda
                key={dia.fecha}
                dia={dia}
                comodinesDisponibles={comodinesDisponibles}
                platillosComodin={platillosComodin}
              />
            ) : (
              <div key={j} className="h-[112px] w-full min-w-[140px] flex-1 shrink-0" />
            ),
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-[26px] gap-y-2 pt-2">
        <Leyenda color="border border-line bg-surface" label="Disponible" />
        <Leyenda color="border border-gold bg-gold" label="Elegido" />
        <Leyenda color="border border-gold bg-gold" label="Comodín" />
        <Leyenda color="border border-disabled bg-surface" label="Cerrado — dentro de 48 h" />
      </div>
    </div>
    </div>
  );
}

function Leyenda({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-[14px] rounded-badge ${color}`} />
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  );
}
