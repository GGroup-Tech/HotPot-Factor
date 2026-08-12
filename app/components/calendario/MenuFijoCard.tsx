import { DIAS_SEMANA, MESES, type PlatilloRef } from "@/lib/calendario";

const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" });

/**
 * Tarjeta "Menú fijo de {mes}" que corona el calendario. Si el menú
 * del mes todavía no se publica (`menuPublicado = false`), en vez de
 * pintar 5 columnas vacías con "Por definir" — lo que se leía como
 * una pantalla rota — muestra un aviso explícito con la fecha real de
 * publicación (`fechaPublicacionMenu`, día 20 del mes anterior).
 */
export function MenuFijoCard({
  mesNum,
  menuPorDia,
  menuPublicado,
  fechaPublicacion,
  comodinPlatillos,
}: {
  mesNum: number;
  menuPorDia: Map<number, PlatilloRef>;
  menuPublicado: boolean;
  fechaPublicacion: Date;
  comodinPlatillos: PlatilloRef[];
}) {
  if (!menuPublicado) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface px-6 py-[22px]">
        <p className="text-eyebrow text-gold">MENÚ FIJO DE {(MESES[mesNum - 1] ?? "").toUpperCase()}</p>
        <p className="text-[14px] leading-[22px] text-muted">
          Todavía no se publica el menú de este mes. Se publica el {fechaCorta.format(fechaPublicacion)} —
          vuelve entonces para elegir tus platillos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[14px] rounded-card border border-line bg-surface px-6 py-[22px]">
      <p className="text-eyebrow text-gold">MENÚ FIJO DE {(MESES[mesNum - 1] ?? "").toUpperCase()}</p>
      <div className="flex w-full flex-wrap gap-3">
        {DIAS_SEMANA.map((h, i) => {
          const p = menuPorDia.get(i + 1);
          return (
            <div
              key={h}
              className="flex min-w-[100px] flex-1 flex-col gap-1.5 rounded-control border border-line bg-ink px-3.5 py-3"
            >
              <p className="text-[10px] font-medium tracking-[0.8px] text-muted">{h}</p>
              <p className="text-[14px] leading-5 text-cream">{p?.nombre ?? "Por definir"}</p>
            </div>
          );
        })}
      </div>
      {comodinPlatillos.length > 0 && (
        <>
          <div className="h-px w-full bg-line" />
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[14px] text-muted">
              Comodines — puedes usarlos en lugar del platillo fijo de cualquier día:
            </p>
            {comodinPlatillos.map((p) => (
              <span key={p.id} className="pill text-[13px]">
                {p.nombre}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
