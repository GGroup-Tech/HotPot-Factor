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
    // `fechaPublicacion` (día 20 del mes anterior) puede ya haber
    // pasado — p.ej. si es agosto y el menú sigue sin publicarse, el
    // 20 de julio ya quedó atrás. Antes esto se mostraba igual como
    // "se publica el 20 de julio, vuelve entonces", una fecha pasada
    // presentada como promesa a futuro. Si ya venció, se muestra un
    // mensaje genérico en vez de una fecha incorrecta.
    const fechaVencida = fechaPublicacion.getTime() <= Date.now();
    return (
      <div className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface px-6 py-[22px]">
        <p className="text-eyebrow text-gold">MENÚ FIJO DE {(MESES[mesNum - 1] ?? "").toUpperCase()}</p>
        <p className="text-[14px] leading-[22px] text-muted">
          {fechaVencida
            ? "Todavía no está disponible el menú de este mes. Vuelve pronto para elegir tus platillos."
            : `Todavía no se publica el menú de este mes. Se publica el ${fechaCorta.format(fechaPublicacion)} — vuelve entonces para elegir tus platillos.`}
        </p>
      </div>
    );
  }

  // Figma (180:54-56) resume el menú fijo en una sola barra delgada
  // "LUN Pollo · MAR Enchiladas · ... · Comodines: X · Y" en vez de la
  // tarjeta de 5 columnas que se usaba antes — es lo que hacía que el
  // calendario se viera distinto al diseño.
  const partes = DIAS_SEMANA.map((h, i) => `${h} ${menuPorDia.get(i + 1)?.nombre ?? "Por definir"}`);
  const texto =
    partes.join("  ·  ") +
    (comodinPlatillos.length > 0
      ? `  ·  Comodines: ${comodinPlatillos.map((p) => p.nombre).join(" · ")}`
      : "");

  return (
    <div className="flex w-full items-center gap-2.5 rounded-card-sm border border-line bg-surface px-[18px] py-[13px]">
      <span className="size-[5px] shrink-0 rounded-full bg-gold" />
      <p className="flex-1 text-[13px] text-muted">{texto}</p>
    </div>
  );
}
