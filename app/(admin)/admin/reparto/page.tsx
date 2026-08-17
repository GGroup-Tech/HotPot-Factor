import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { ImprimirButton } from "@/app/components/admin/ImprimirButton";
import { ExportarCsvButton } from "@/app/components/admin/ExportarCsvButton";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ESTADO_INFO: Record<string, { label: string; color: string }> = {
  entregado: { label: "Entregado", color: "success" },
  programado: { label: "Pendiente", color: "muted" },
  en_produccion: { label: "Pendiente", color: "muted" },
  cancelado: { label: "Cancelado", color: "danger" },
};

/**
 * AC — Admin · Reparto. Figma node 184:123. Lista de entregas del día
 * con dirección real, agrupadas por zona.
 *
 * Corregido 2026-08-17: `usuarios` no tiene columna `direccion` — son
 * `calle_numero` y `codigo_postal` por separado (confirmado contra
 * information_schema.columns). El `.select()` anidado pedía esa
 * columna inexistente, así que PostgREST rechazaba la consulta
 * COMPLETA en silencio y la pantalla siempre mostraba "sin entregas",
 * sin importar cuántos pedidos reales hubiera ese día.
 */
export default async function AdminRepartoPage({
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

  const { data: pedidosRaw, error: pedidosError } = await admin
    .from("pedidos")
    .select("id, estado, direccion_entrega, platillos(nombre), usuarios(nombre, colonia, calle_numero, codigo_postal)")
    .eq("fecha_entrega", fechaISO)
    .neq("estado", "cancelado")
    .order("id");

  if (pedidosError) {
    console.error("AdminRepartoPage: SELECT a `pedidos` falló", {
      fechaISO,
      code: pedidosError.code,
      message: pedidosError.message,
      details: pedidosError.details,
      hint: pedidosError.hint,
    });
  }

  type Fila = {
    id: string;
    estado: string;
    direccion_entrega: string | null;
    platillos: { nombre: string } | null;
    usuarios: { nombre: string; colonia: string | null; calle_numero: string | null; codigo_postal: string | null } | null;
  };
  const pedidos = (pedidosRaw ?? []) as unknown as Fila[];

  function direccionCompleta(p: Fila): string | null {
    if (p.direccion_entrega) return p.direccion_entrega;
    const partes = [p.usuarios?.calle_numero, p.usuarios?.colonia, p.usuarios?.codigo_postal].filter(Boolean);
    return partes.length > 0 ? partes.join(", ") : null;
  }

  const porZona = new Map<string, number>();
  for (const p of pedidos) {
    const zona = p.usuarios?.colonia?.trim() || "Sin zona";
    porZona.set(zona, (porZona.get(zona) ?? 0) + 1);
  }
  const zonasOrdenadas = [...porZona.entries()].sort((a, b) => b[1] - a[1]);

  const filasCsv: string[][] = [
    ["#", "Zona", "Dirección", "Cliente", "Platillo", "Estado"],
    ...pedidos.map((p, i) => [
      String(i + 1).padStart(3, "0"),
      p.usuarios?.colonia ?? "",
      direccionCompleta(p) ?? "",
      p.usuarios?.nombre ?? "",
      p.platillos?.nombre ?? "",
      ESTADO_INFO[p.estado]?.label ?? p.estado,
    ]),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 rounded-pill border border-line bg-surface px-[16px] py-[10px]">
          <a href={`/admin/reparto?fecha=${toISODate(anterior)}`} className="text-[16px] text-gold">
            ‹
          </a>
          <p className="text-[14px] font-medium text-cream">{fechaLarga.format(fecha)}</p>
          <a href={`/admin/reparto?fecha=${toISODate(siguiente)}`} className="text-[16px] text-gold">
            ›
          </a>
        </div>
        <div className="flex gap-2.5">
          <ExportarCsvButton filas={filasCsv} nombreArchivo={`reparto-${fechaISO}.csv`} className="btn-secondary rounded-control px-[18px] py-[10px] text-[13px]">
            Exportar CSV
          </ExportarCsvButton>
          <ImprimirButton className="btn-primary rounded-control px-[18px] py-[10px] text-[13px]">
            Imprimir rutas
          </ImprimirButton>
        </div>
      </div>

      <p className="text-[13px] text-muted">
        {fechaLarga.format(fecha)} ({fechaISO}) · {pedidos.length} entregas
      </p>

      {pedidosError ? (
        <div className="rounded-card border border-danger bg-danger/10 px-5 py-4 text-[13px] text-danger">
          <p className="font-medium">Error al consultar entregas — mándale esto a soporte:</p>
          <p className="mt-1 font-mono text-[12px]">
            code: {pedidosError.code ?? "—"} · {pedidosError.message}
            {pedidosError.details ? ` · details: ${pedidosError.details}` : ""}
            {pedidosError.hint ? ` · hint: ${pedidosError.hint}` : ""}
          </p>
        </div>
      ) : null}

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zonasOrdenadas.length === 0 ? (
          <p className="text-[13px] text-muted">Sin entregas para este día.</p>
        ) : (
          zonasOrdenadas.map(([zona, cantidad]) => (
            <div key={zona} className="flex flex-col gap-1.5 rounded-card border border-line bg-surface px-5 py-4.5">
              <p className="text-[10px] font-medium tracking-[0.8px] text-gold">{zona.toUpperCase()}</p>
              <p className="font-display text-[26px] font-semibold text-cream">{cantidad} entregas</p>
            </div>
          ))
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
              <th className="px-5 py-3.5 font-medium">#</th>
              <th className="px-5 py-3.5 font-medium">Zona</th>
              <th className="px-5 py-3.5 font-medium">Dirección</th>
              <th className="px-5 py-3.5 font-medium">Cliente</th>
              <th className="px-5 py-3.5 font-medium">Platillo</th>
              <th className="px-5 py-3.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-muted">
                  No hay entregas programadas para este día.
                </td>
              </tr>
            ) : (
              pedidos.map((p, i) => {
                const info = ESTADO_INFO[p.estado] ?? { label: p.estado, color: "muted" };
                return (
                  <tr key={p.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                    <td className="px-5 py-3.5 text-muted">{String(i + 1).padStart(3, "0")}</td>
                    <td className="px-5 py-3.5">{p.usuarios?.colonia ?? "—"}</td>
                    <td className="px-5 py-3.5">{direccionCompleta(p) ?? "—"}</td>
                    <td className="px-5 py-3.5">{p.usuarios?.nombre ?? "—"}</td>
                    <td className="px-5 py-3.5">{p.platillos?.nombre ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`pill border ${
                          info.color === "success"
                            ? "border-success text-success"
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
