import Image from "next/image";

export interface PlatilloCardData {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  etiqueta: string | null;
  kcal: number | null;
  proteina_g: number | null;
  carbohidratos_g: number | null;
  grasa_g: number | null;
}

/** Tarjeta de platillo del menú semanal — Figma node 244:131 y análogas. */
export function PlatilloCard({ platillo }: { platillo: PlatilloCardData }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-card-lg border border-line bg-surface">
      <div className="relative h-[180px] w-full bg-raised">
        {platillo.imagen_url && (
          <Image src={platillo.imagen_url} alt={platillo.nombre} fill className="object-cover" />
        )}
      </div>
      <div className="flex flex-col gap-3 p-[22px]">
        {platillo.etiqueta && (
          <span className="w-fit rounded-pill bg-raised px-[10px] py-[5px] text-[10px] font-medium uppercase tracking-[0.6px] text-gold">
            {platillo.etiqueta}
          </span>
        )}
        <p className="text-[19px] font-medium text-cream">{platillo.nombre}</p>
        {platillo.descripcion && (
          <p className="text-[14px] leading-[22px] text-muted">{platillo.descripcion}</p>
        )}
        <div className="flex items-center justify-between text-[13px] text-muted">
          <span className="num text-gold">1 crédito</span>
          {platillo.kcal != null && <span>{platillo.kcal} kcal</span>}
        </div>
        {(platillo.proteina_g != null || platillo.carbohidratos_g != null || platillo.grasa_g != null) && (
          <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            <div>
              <p className="num text-[14px] text-cream">{platillo.proteina_g ?? "—"}g</p>
              <p className="text-[11px] text-muted">Proteína</p>
            </div>
            <div>
              <p className="num text-[14px] text-cream">{platillo.carbohidratos_g ?? "—"}g</p>
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
