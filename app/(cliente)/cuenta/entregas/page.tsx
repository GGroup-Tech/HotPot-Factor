import Link from "next/link";
import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { EstadoPedidoBadge } from "@/app/components/ui/Badge";
import { puedeEditarPedido } from "@/lib/creditos";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 07 — Próximas entregas. */
export default async function EntregasPage() {
  const { user } = await requireUsuario();
  const supabase = await createClient();

  const hoy = new Date();
  const hace30dias = new Date(hoy);
  hace30dias.setDate(hace30dias.getDate() - 30);

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, fecha_entrega, estado, es_comodin, platillos(nombre)")
    .eq("usuario_id", user.id)
    .gte("fecha_entrega", toISODate(hace30dias))
    .order("fecha_entrega", { ascending: true });

  const proximos = (pedidos ?? []).filter((p) => p.fecha_entrega >= toISODate(hoy) && p.estado !== "cancelado");
  const pasados = (pedidos ?? []).filter((p) => p.fecha_entrega < toISODate(hoy) || p.estado === "cancelado");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-gold">MIS ENTREGAS</p>
        <h1 className="text-display-m text-cream">Próximas entregas</h1>
      </div>

      {proximos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card-lg border border-line bg-surface p-7">
          <p className="text-[15px] text-muted">Todavía no tienes entregas programadas.</p>
          <Link href="/arma-tu-mes" className="btn-primary rounded-control px-6 py-[13px] text-[15px]">
            Armar mi mes
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {proximos.map((p) => {
            const platillo = p.platillos as unknown as { nombre: string } | null;
            const editable = puedeEditarPedido(new Date(`${p.fecha_entrega}T00:00:00`));
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-[15px] font-medium capitalize text-cream">
                    {fechaLarga.format(new Date(`${p.fecha_entrega}T00:00:00`))}
                  </p>
                  <p className="text-[14px] text-muted">
                    {platillo?.nombre ?? "Por asignar"}
                    {p.es_comodin && " · Comodín"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <EstadoPedidoBadge estado={p.estado} />
                  {editable ? (
                    <Link href="/arma-tu-mes" className="text-[13px] text-gold hover:underline">
                      Editar
                    </Link>
                  ) : (
                    <span className="text-[12px] text-disabled">Cerrado — 48h</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pasados.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-medium text-muted">Últimos 30 días</p>
          <div className="flex flex-col gap-2">
            {pasados.map((p) => {
              const platillo = p.platillos as unknown as { nombre: string } | null;
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-card-sm border border-line bg-ink px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-[14px] capitalize text-muted">
                      {fechaLarga.format(new Date(`${p.fecha_entrega}T00:00:00`))}
                    </p>
                    <p className="text-[13px] text-muted">{platillo?.nombre ?? "—"}</p>
                  </div>
                  <EstadoPedidoBadge estado={p.estado} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
