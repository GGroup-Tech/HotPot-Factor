import Image from "next/image";

export interface PlatilloCardData {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  calorias: number | null;
  proteina_g: number | null;
  carbs_g: number | null;
  grasa_g: number | null;
  grasa_saturada_g: number | null;
  fibra_g: number | null;
  sodio_mg: number | null;
  alergenos: string | null;
}

/** Tarjeta de platillo del menú semanal — Figma node 244:131 y análogas. */
export function PlatilloCard({ platillo }: { platillo: PlatilloCardData }) {
  const tieneNutricion =
    platillo.proteina_g != null ||
    platillo.carbs_g != null ||
    platillo.grasa_g != null ||
    platillo.grasa_saturada_g != null ||
    platillo.fibra_g != null ||
    platillo.sodio_mg != null;

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
        {tieneNutricion && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.6px] text-gold">
              Información nutrimental · por porción
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <DatoNutricional valor={platillo.proteina_g} unidad="g" etiqueta="Proteína" />
              <DatoNutricional valor={platillo.carbs_g} unidad="g" etiqueta="Carbs" />
              <DatoNutricional valor={platillo.grasa_g} unidad="g" etiqueta="Grasa" />
              <DatoNutricional valor={platillo.grasa_saturada_g} unidad="g" etiqueta="G. sat." />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <DatoNutricional valor={platillo.fibra_g} unidad="g" etiqueta="Fibra" />
              <DatoNutricional valor={platillo.sodio_mg} unidad="mg" etiqueta="Sodio" />
            </div>
          </div>
        )}
        {platillo.alergenos && (
          <p className="border-t border-line pt-3 text-[12px] leading-[18px] text-muted">
            <span className="font-medium text-cream">Alérgenos: </span>
            {platillo.alergenos}
          </p>
        )}
      </div>
    </div>
  );
}

function DatoNutricional({ valor, unidad, etiqueta }: { valor: number | null; unidad: string; etiqueta: string }) {
  return (
    <div>
      <p className="num text-[14px] text-cream">{valor != null ? `${valor}${unidad}` : "—"}</p>
      <p className="text-[11px] text-muted">{etiqueta}</p>
    </div>
  );
}
