import Link from "next/link";
import { MESES, type MesRef } from "@/lib/calendario";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Pill de navegación ‹ Mes Año › que reciben tanto `/arma-tu-mes` como
 * `/cuenta/calendario`. `basePath` es lo único que cambia entre las
 * dos rutas.
 */
export function MesNav({
  basePath,
  anio,
  mesNum,
  mesAnterior,
  mesSiguiente,
}: {
  basePath: string;
  anio: number;
  mesNum: number;
  mesAnterior: MesRef;
  mesSiguiente: MesRef;
}) {
  return (
    <div className="flex items-center gap-4 rounded-pill border border-line bg-surface px-[18px] py-[11px]">
      <Link
        href={`${basePath}?mes=${mesAnterior.anio}-${pad(mesAnterior.mesNum)}`}
        className="text-[18px] text-muted hover:text-cream"
      >
        ‹
      </Link>
      <p className="text-[16px] font-medium text-cream">
        {MESES[mesNum - 1]} {anio}
      </p>
      <Link
        href={`${basePath}?mes=${mesSiguiente.anio}-${pad(mesSiguiente.mesNum)}`}
        className="text-[18px] text-gold hover:text-gold/80"
      >
        ›
      </Link>
    </div>
  );
}
