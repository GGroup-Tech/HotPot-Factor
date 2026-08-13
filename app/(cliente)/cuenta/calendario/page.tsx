import Link from "next/link";
import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { obtenerCalendarioMes, resolverMes } from "@/lib/calendario";
import { Calendario, CalendarioLeyenda } from "@/app/components/calendario/Calendario";
import { MenuFijoCard } from "@/app/components/calendario/MenuFijoCard";
import { MesNav } from "@/app/components/calendario/MesNav";

/**
 * Mi calendario — vista del panel de cliente. A diferencia de
 * `/arma-tu-mes` (pantalla 04 del flujo de compra, con FlowNav +
 * Stepper y un botón "Guardar cambios" que manda a /confirmacion),
 * esta ruta vive dentro de `(cliente)` y hereda el chrome del panel
 * (ClienteChrome: header + sidebar) sin nada de compra encima. Cada
 * cambio en el calendario ya se guarda al toque (las acciones en
 * `app/components/calendario/actions.ts` son server actions
 * inmediatas), así que no hay un paso de "guardar" separado aquí.
 *
 * Ambas rutas comparten toda la data-fetching y los componentes de
 * calendario (`lib/calendario.ts`, `app/components/calendario/*`) —
 * esta página es una vista distinta sobre los mismos datos, no una
 * copia de la pantalla de compra.
 */
export default async function CalendarioPanelPage({
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-gold">MI CALENDARIO</p>
        <h1 className="text-display-m text-cream">Arma tu mes</h1>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <MesNav
          basePath="/cuenta/calendario"
          anio={anio}
          mesNum={mesNum}
          mesAnterior={mesCal.mesAnterior}
          mesSiguiente={mesCal.mesSiguiente}
        />
        <CalendarioLeyenda />
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

      {/* Barra inferior — Figma 180:187. "Guardar cambios" no aplica
          aquí (a diferencia de /arma-tu-mes, que es un paso del flujo
          de compra): cada acción del calendario ya es una server
          action inmediata, así que solo se deja el CTA real de
          comprar más créditos. */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card-lg border border-line bg-surface px-6 py-5">
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-medium text-cream">
            {mesCal.asignadosEsteMes} de {mesCal.totalCreditos} créditos asignados
            &nbsp;&nbsp;·&nbsp;&nbsp;{mesCal.saldo} sin usar
          </p>
          <div className="h-[5px] w-[300px] max-w-full overflow-hidden rounded-pill bg-line">
            <div
              className="h-[5px] rounded-pill bg-gold"
              style={{
                width: mesCal.totalCreditos > 0 ? `${(mesCal.asignadosEsteMes / mesCal.totalCreditos) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
        <Link href="/paquetes" className="btn-secondary rounded-control px-6 py-[13px] text-[15px]">
          Comprar paquete
        </Link>
      </div>
      <p className="text-[13px] text-muted">
        Mueve, cambia o cancela cualquier entrega cuando quieras. Solo se bloquean las que salen en las
        próximas 48 horas. Los cambios se guardan al momento.
      </p>
    </div>
  );
}
