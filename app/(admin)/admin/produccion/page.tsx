import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { puedeEditarPedido } from "@/lib/creditos";
import { ImprimirButton } from "@/app/components/admin/ImprimirButton";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A2 — Admin · Producción. Figma node 253:2.
 *
 * El mock incluye "Costo estimado" ($/porción) y ventanas de entrega
 * por zona ("Entregar entre 12:00 y 2:00 pm"). Ninguno de los dos
 * existe en el esquema real: `platillos` no tiene columna de costo, y
 * no hay ningún concepto de ventana horaria de reparto en `pedidos`
 * ni en `zonas_cobertura`. En vez de inventar esos números, esta
 * página solo muestra lo que sí es real: porciones totales, el
 * desglose por platillo (fijo vs. comodín) y por zona (colonia), y el
 * estado del corte de 48h (derivado de `puedeEditarPedido`, la misma
 * regla que usa todo el resto del proyecto).
 */
export default async function AdminProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  await requireStaff();
  const admin = createAdminClient();
  const { fecha: fechaParam } = await searchParams;

  const fecha = fechaParam ? new Date(`${fechaParam}T00:00:00`) : new Date();
  const fechaISO = toISODate(fecha);
  const anterior = new Date(fecha);
  anterior.setDate(fecha.getDate() - 1);
  const siguiente = new Date(fecha);
  siguiente.setDate(fecha.getDate() + 1);

  const { data: pedidosRaw } = await admin
    .from("pedidos")
    .select("id, es_comodin, platillos(id, nombre), usuarios(colonia)")
    .eq("fecha_entrega", fechaISO)
    .neq("estado", "cancelado");

  const pedidos = pedidosRaw ?? [];
  const corteAbierto = puedeEditarPedido(fecha);

  const porPlatillo = new Map<string, { nombre: string; esComodin: boolean; cantidad: number }>();
  for (const p of pedidos) {
    const platillo = p.platillos as unknown as { id: string; nombre: string } | null;
    if (!platillo) continue;
    const actual = porPlatillo.get(platillo.id) ?? { nombre: platillo.nombre, esComodin: p.es_comodin, cantidad: 0 };
    actual.cantidad += 1;
    porPlatillo.set(platillo.id, actual);
  }
  const platillosOrdenados = [...porPlatillo.values()].sort((a, b) => b.cantidad - a.cantidad);

  const porZona = new Map<string, number>();
  for (const p of pedidos) {
    const usuario = p.usuarios as unknown as { colonia: string | null } | null;
    const zona = usuario?.colonia?.trim() || "Sin zona registrada";
    porZona.set(zona, (porZona.get(zona) ?? 0) + 1);
  }
  const zonasOrdenadas = [...porZona.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 rounded-pill border border-line bg-surface px-[16px] py-[10px]">
          <a href={`/admin/produccion?fecha=${toISODate(anterior)}`} className="text-[17px] text-muted hover:text-cream">
            ‹
          </a>
          <p className="text-[15px] font-medium text-cream">{fechaLarga.format(fecha)}</p>
          <a href={`/admin/produccion?fecha=${toISODate(siguiente)}`} className="text-[17px] text-gold">
            ›
          </a>
        </div>
        <ImprimirButton className="btn-secondary rounded-control px-[18px] py-[11px] text-[13px]">
          Imprimir lista
        </ImprimirButton>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard etiqueta="TOTAL A PRODUCIR" valor={`${pedidos.length} porciones`} nota={`en ${porZona.size} ${porZona.size === 1 ? "zona" : "zonas"} hoy`} />
        <StatCard
          etiqueta="CORTE"
          valor={corteAbierto ? "Abierto" : "Cerrado"}
          nota={corteAbierto ? "los clientes aún pueden cambiar este día" : "ya pasó el límite de 48h"}
        />
        <StatCard etiqueta="PLATILLOS DISTINTOS" valor={String(porPlatillo.size)} nota="fijos y comodines combinados" />
      </div>

      <p className="text-[18px] font-medium text-cream">Por platillo</p>
      <div className="flex w-full flex-col gap-3">
        {platillosOrdenados.length === 0 ? (
          <p className="rounded-card border border-line bg-surface px-6 py-8 text-center text-[14px] text-muted">
            No hay pedidos programados para este día.
          </p>
        ) : (
          platillosOrdenados.map((p) => (
            <div key={p.nombre} className="flex w-full items-center justify-between gap-6 rounded-card border border-line bg-surface px-6 py-5">
              <div className="flex items-center gap-2.5">
                <p className="text-[18px] font-medium text-cream">{p.nombre}</p>
                <span className="rounded-[4px] border border-line px-2.5 py-1 text-[11px] text-muted">
                  {p.esComodin ? "Comodín" : "Platillo fijo"}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="font-display text-[36px] font-semibold text-gold">{p.cantidad}</p>
                <p className="text-[13px] text-muted">porciones</p>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[18px] font-medium text-cream">Distribución por zona</p>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zonasOrdenadas.length === 0 ? (
          <p className="text-[13px] text-muted">Sin zonas para este día.</p>
        ) : (
          zonasOrdenadas.map(([zona, cantidad]) => (
            <div key={zona} className="flex flex-col gap-2 rounded-card border border-line bg-surface px-5 py-5">
              <p className="text-[10px] font-medium tracking-[0.8px] text-gold">{zona.toUpperCase()}</p>
              <p className="font-display text-[32px] font-semibold text-cream">{cantidad}</p>
              <p className="text-[12px] text-muted">porciones</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface px-5 py-4.5">
      <p className="text-[9px] font-medium tracking-[0.9px] text-gold">{etiqueta}</p>
      <p className="font-display text-[22px] font-semibold text-cream">{valor}</p>
      <p className="text-[12px] text-muted">{nota}</p>
    </div>
  );
}
