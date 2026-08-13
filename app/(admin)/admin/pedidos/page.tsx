import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolverMes, MESES } from "@/lib/calendario";
import { MesNav } from "@/app/components/calendario/MesNav";

const fechaCorta = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const ESTADO_INFO: Record<string, { label: string; color: string }> = {
  programado: { label: "Programado", color: "gold" },
  en_produccion: { label: "En producción", color: "warning" },
  entregado: { label: "Entregado", color: "success" },
  cancelado: { label: "Cancelado", color: "danger" },
};

/**
 * AB — Admin · Pedidos. Figma node 184:2. Tabla de todos los pedidos
 * del mes (no solo los de hoy, a diferencia de A0) con búsqueda por
 * cliente y navegación de mes.
 *
 * Usa `createAdminClient()` — igual que A0 y `publicarMenu` — porque
 * `requireStaff()` ya verificó identidad; sin esto, RLS filtraría en
 * silencio los pedidos de otros usuarios y la tabla se vería vacía
 * aunque haya datos reales (el mismo bug que ya se corrigió en otros
 * puntos del proyecto).
 */
export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; q?: string }>;
}) {
  await requireStaff();
  const admin = createAdminClient();
  const { mes: mesParam, q } = await searchParams;
  const { anio, mesNum } = resolverMes(mesParam);

  const primerDia = `${anio}-${pad(mesNum)}-01`;
  const ultimoDiaDate = new Date(anio, mesNum, 0);
  const ultimoDia = `${anio}-${pad(mesNum)}-${pad(ultimoDiaDate.getDate())}`;
  const mesAnteriorDate = new Date(anio, mesNum - 2, 1);
  const mesSiguienteDate = new Date(anio, mesNum, 1);

  const { data: pedidosRaw } = await admin
    .from("pedidos")
    .select("id, fecha_entrega, estado, es_comodin, platillos(nombre), usuarios(nombre)")
    .gte("fecha_entrega", primerDia)
    .lte("fecha_entrega", ultimoDia)
    .order("fecha_entrega", { ascending: true });

  type Fila = {
    id: string;
    fecha_entrega: string;
    estado: string;
    es_comodin: boolean;
    platillos: { nombre: string } | null;
    usuarios: { nombre: string } | null;
  };
  let pedidos = (pedidosRaw ?? []) as unknown as Fila[];

  const busqueda = q?.trim().toLowerCase();
  if (busqueda) {
    pedidos = pedidos.filter((p) => (p.usuarios?.nombre ?? "").toLowerCase().includes(busqueda));
  }

  const activos = pedidos.filter((p) => p.estado !== "cancelado").length;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">
        {MESES[mesNum - 1]} {anio} · {activos} pedidos activos
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <form method="get" className="flex-1 min-w-[220px]">
          {mesParam && <input type="hidden" name="mes" value={mesParam} />}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por cliente…"
            className="w-full rounded-control border border-line bg-surface px-4 py-[11px] text-[14px] text-cream placeholder:text-muted focus:border-gold/60 focus:outline-none"
          />
        </form>
        <MesNav
          basePath="/admin/pedidos"
          anio={anio}
          mesNum={mesNum}
          mesAnterior={{ anio: mesAnteriorDate.getFullYear(), mesNum: mesAnteriorDate.getMonth() + 1 }}
          mesSiguiente={{ anio: mesSiguienteDate.getFullYear(), mesNum: mesSiguienteDate.getMonth() + 1 }}
        />
      </div>

      <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
              <th className="px-5 py-3.5 font-medium">#</th>
              <th className="px-5 py-3.5 font-medium">Fecha</th>
              <th className="px-5 py-3.5 font-medium">Cliente</th>
              <th className="px-5 py-3.5 font-medium">Platillo</th>
              <th className="px-5 py-3.5 font-medium">Crédito</th>
              <th className="px-5 py-3.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-muted">
                  No hay pedidos que coincidan.
                </td>
              </tr>
            ) : (
              pedidos.map((p, i) => {
                const info = ESTADO_INFO[p.estado] ?? { label: p.estado, color: "muted" };
                return (
                  <tr key={p.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                    <td className="px-5 py-3.5 text-muted">{String(i + 1).padStart(3, "0")}</td>
                    <td className="px-5 py-3.5">
                      {fechaCorta.format(new Date(`${p.fecha_entrega}T00:00:00`))}
                    </td>
                    <td className="px-5 py-3.5">{p.usuarios?.nombre ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      {p.platillos?.nombre ?? "—"}
                      {p.es_comodin && <span className="ml-2 badge bg-gold/15 text-gold">Comodín</span>}
                    </td>
                    <td className="px-5 py-3.5">1</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`pill border ${
                          info.color === "gold"
                            ? "border-gold text-gold"
                            : info.color === "success"
                              ? "border-success text-success"
                              : info.color === "warning"
                                ? "border-warning text-warning"
                                : info.color === "danger"
                                  ? "border-danger text-danger"
                                  : "border-line text-muted"
                        }`}
                      >
                        {info.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
