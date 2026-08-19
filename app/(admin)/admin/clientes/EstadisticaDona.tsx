interface FilaEstadistica {
  etiqueta: string;
  valor: number;
}

// Mismos tokens de color que tailwind.config.ts (gold/success/warning/
// danger/muted/cream) — hex directo porque conic-gradient necesita
// valores reales, no clases de Tailwind.
const PALETA = ["#C9A15C", "#7FB069", "#D9A441", "#C0654F", "#9A8E7A", "#E2D5BD"];

/**
 * Dona de composición — CSS puro (conic-gradient), sin SVG ni
 * librería de charts. Para "categoría → % del total" (paquete más
 * comprado, canal de adquisición) — a diferencia de EstadisticaBarras,
 * que es para distribuciones con orden (edad, frecuencia, antigüedad),
 * donde una dona rompería la sensación de progresión.
 */
export function EstadisticaDona({
  titulo,
  filas,
  vacio = "Sin datos todavía.",
}: {
  titulo: string;
  filas: FilaEstadistica[];
  vacio?: string;
}) {
  const total = filas.reduce((acc, f) => acc + f.valor, 0);

  let acumulado = 0;
  const segmentos = filas.map((f, i) => {
    const inicio = total > 0 ? (acumulado / total) * 100 : 0;
    acumulado += f.valor;
    const fin = total > 0 ? (acumulado / total) * 100 : 0;
    return { ...f, color: PALETA[i % PALETA.length], inicio, fin };
  });

  const gradiente =
    total > 0
      ? `conic-gradient(${segmentos.map((s) => `${s.color} ${s.inicio}% ${s.fin}%`).join(", ")})`
      : "#33291F";

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface px-6 py-5">
      <p className="text-[13px] font-medium text-cream">{titulo}</p>
      {total === 0 ? (
        <p className="text-[13px] text-muted">{vacio}</p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative size-[120px] shrink-0 rounded-full" style={{ background: gradiente }}>
            <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-surface">
              <p className="font-display text-[20px] font-semibold text-cream">{total}</p>
              <p className="text-[10px] text-muted">total</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {segmentos.map((s) => {
              const pct = Math.round((s.valor / total) * 100);
              return (
                <div key={s.etiqueta} className="flex items-center justify-between gap-3 text-[12px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-[8px] shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <p className="truncate text-cream">{s.etiqueta}</p>
                  </div>
                  <p className="shrink-0 text-muted">
                    {s.valor} · {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
