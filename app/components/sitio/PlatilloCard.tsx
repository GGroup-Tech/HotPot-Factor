import Image from "next/image";

/**
 * Esquema real confirmado 2026-08-13: `foto_url` (no `imagen_url`),
 * `calorias` (no `kcal`), `carbs_g` (no `carbohidratos_g`). No existe
 * columna `etiqueta` en la base — el badge tipo "ALTO EN PROTEÍNA" se
 * quitó del todo en vez de fingir un dato que no existe.
 */
export interface PlatilloCardData {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  calorias: number | null;
  proteina_g: number | null;
  carbs_g: number | null;
  grasa_g: number | null;
}

/** Tarjeta de platillo del menú semanal — Figma node 244:131 y análogas. */
export function PlatilloCard({ platillo }: { platillo: PlatilloCardData }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-card-lg border border-line bg-surface">
      <div className="relative h-[180px] w-full bg-raised">
        {platillo.foto_url && (
          <Image src={platillo.foto_url} alt={platillo.nombre} fill className="object-cover" />
        )}
      </div>
      <div className="flex flex-col gap-3 p-[22px]">
        <p className="text-[19px] font-medium text-cream">{platillo.nombre}</p>
        {platillo.descripcion && (
          <p className="text-[14px] leading-[22px] text-muted">{platillo.descripcion}</p>
        )}
        <div className="flex items-center justify-between text-[13px] text-muted">
          <span className="num text-gold">1 crédito</span>
          {platillo.calorias != null && <span>{platillo.calorias} kcal</span>}
        </div>
        {(platillo.proteina_g != null || platillo.carbs_g != null || platillo.grasa_g != null) && (
          <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            <div>
              <p className="num text-[14px] text-cream">{platillo.proteina_g ?? "—"}g</p>
              <p className="text-[11px] text-muted">Proteína</p>
            </div>
            <div>
              <p className="num text-[14px] text-cream">{platillo.carbs_g ?? "—"}g</p>
              <p className="text-[11px] text-muted">Carbs</p>
            </div>
            <div>
              <p className="num text-[14px] text-cream">{platillo.grasa_g ?? "—"}g</p>
              <p className="text-[11px] text-muted">Grasa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
