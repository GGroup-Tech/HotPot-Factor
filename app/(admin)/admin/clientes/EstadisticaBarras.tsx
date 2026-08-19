interface FilaEstadistica {
  etiqueta: string;
  valor: number;
}

/**
 * Barra de distribución horizontal — CSS puro (ancho en %, sin SVG ni
 * librería de charts), mismo patrón que las barras de progreso que ya
 * existen en Arma tu mes / Producción. Sirve para cualquier
 * "categoría → conteo": edad, canal, paquete, frecuencia, antigüedad.
 */
export function EstadisticaBarras({
  titulo,
  filas,
  colorBarra = "bg-gold",
  vacio = "Sin datos todavía.",
}: {
  titulo: string;
  filas: FilaEstadistica[];
  colorBarra?: string;
  vacio?: string;
}) {
  const total = filas.reduce((acc, f) => acc + f.valor, 0);
  const max = Math.max(1, ...filas.map((f) => f.valor));

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface px-6 py-5">
      <p className="text-[13px] font-medium text-cream">{titulo}</p>
      {total === 0 ? (
        <p className="text-[13px] text-muted">{vacio}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filas.map((f) => {
            const pct = Math.round((f.valor / total) * 100);
            const anchoBarra = Math.max(f.valor > 0 ? 3 : 0, Math.round((f.valor / max) * 100));
            return (
              <div key={f.etiqueta} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <p className="text-cream">{f.etiqueta}</p>
                  <p className="text-muted">
                    {f.valor} · {pct}%
                  </p>
                </div>
                <div className="h-[8px] w-full overflow-hidden rounded-pill bg-line">
                  <div className={`h-[8px] rounded-pill ${colorBarra}`} style={{ width: `${anchoBarra}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
