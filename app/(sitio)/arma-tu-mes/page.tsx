import Link from "next/link";
import { FlowNav } from "@/app/components/sitio/FlowNav";
import { Stepper } from "@/app/components/sitio/Stepper";
import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { obtenerCalendarioMes, resolverMes } from "@/lib/calendario";
import { Calendario, CalendarioLeyenda } from "@/app/components/calendario/Calendario";
import { MenuFijoCard } from "@/app/components/calendario/MenuFijoCard";
import { MesNav } from "@/app/components/calendario/MesNav";

/**
 * 04 — Arma tu mes (flujo de compra). Figma node 108:2. Mantiene el
 * chrome de compra (FlowNav + Stepper 4/5) y termina en "Guardar
 * cambios" → /confirmacion. La data-fetching y el calendario en sí
 * viven en `lib/calendario.ts` / `app/components/calendario/*`,
 * compartidos con la vista independiente del panel en
 * `/cuenta/calendario` — así nunca hay dos calendarios con lógica
 * distinta.
 */
export default async function ArmaTuMesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const { user } = await requireUsuario();
  const supabase = await createClient();

  const { anio, mesNum } = resolverMes(mesParam);
  const mesCal = await obtenerCalendarioMes(supabase, user.id, anio, mesNum);

  return (
    <div className="flex min-h-screen flex-col">
      <FlowNav />
      <Stepper activo={4} />
      <main className="flex flex-col items-start gap-[30px] px-6 md:px-10 lg:px-[100px] pb-10 pt-[52px]">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-[10px]">
            <h1 className="text-display-m text-cream">Arma tu mes</h1>
            <p className="w-full max-w-[620px] text-[16px] leading-[26px] text-muted">
              Mueve, cambia o cancela cualquier entrega cuando quieras. Solo se bloquean las que salen en
              las próximas 48 horas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <MesNav
              basePath="/arma-tu-mes"
              anio={anio}
              mesNum={mesNum}
              mesAnterior={mesCal.mesAnterior}
              mesSiguiente={mesCal.mesSiguiente}
            />
            <CalendarioLeyenda />
          </div>
        </div>

        <MenuFijoCard
          mesNum={mesNum}
          menuPorDia={mesCal.menuPorDia}
          menuPublicado={mesCal.menuPublicado}
          fechaPublicacion={mesCal.fechaPublicacion}
          comodinPlatillos={mesCal.comodinPlatillos}
        />

        <Calendario
          semanas={mesCal.semanas}
          comodinesDisponibles={mesCal.comodinesDisponibles}
          platillosComodin={mesCal.comodinPlatillos}
        />
      </main>

      <div className="flex w-full flex-col gap-4 border-t border-line bg-surface px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-10 lg:px-[100px]">
        <div className="flex flex-col gap-2">
          <p className="text-[18px] font-medium text-cream">
            {mesCal.asignadosEsteMes} de {mesCal.totalCreditos} créditos asignados&nbsp;&nbsp;·&nbsp;&nbsp;
            {mesCal.saldo} sin usar
          </p>
          <div className="h-[6px] w-full max-w-[300px] overflow-hidden rounded-pill bg-line">
            <div
              className="h-[6px] rounded-pill bg-gold"
              style={{
                width: mesCal.totalCreditos > 0 ? `${(mesCal.asignadosEsteMes / mesCal.totalCreditos) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
        <Link href="/confirmacion" className="btn-primary rounded-control px-[34px] py-4 text-[16px]">
          Guardar cambios
        </Link>
      </div>
    </div>
  );
}
