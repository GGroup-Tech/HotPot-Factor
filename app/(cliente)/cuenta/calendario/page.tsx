import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { obtenerCalendarioMes, resolverMes } from "@/lib/calendario";
import { Calendario } from "@/app/components/calendario/Calendario";
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
    <div className="flex flex-col gap-8">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow text-gold">MI CALENDARIO</p>
          <h1 className="text-display-m text-cream">Arma tu mes</h1>
        </div>
        <MesNav
          basePath="/cuenta/calendario"
          anio={anio}
          mesNum={mesNum}
          mesAnterior={mesCal.mesAnterior}
          mesSiguiente={mesCal.mesSiguiente}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-card-lg border border-line bg-surface p-6">
        <p className="text-[15px] font-medium text-cream">
          {mesCal.asignadosEsteMes} de {mesCal.totalCreditos} créditos asignados este mes
          &nbsp;&nbsp;·&nbsp;&nbsp;{mesCal.saldo} sin usar
        </p>
        <div className="h-[6px] w-full max-w-[300px] overflow-hidden rounded-pill bg-line">
          <div
            className="h-[6px] rounded-pill bg-gold"
            style={{
              width: mesCal.totalCreditos > 0 ? `${(mesCal.asignadosEsteMes / mesCal.totalCreditos) * 100}%` : "0%",
            }}
          />
        </div>
        <p className="text-[13px] text-muted">
          Mueve, cambia o cancela cualquier entrega cuando quieras. Solo se bloquean las que salen en las
          próximas 48 horas. Los cambios se guardan al momento.
        </p>
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
    </div>
  );
}
