import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearCupon, alternarCupon } from "../../actions";

const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/**
 * Cupones — Figma nodes 185:125 y 204:2. `cupones`/`uso_cupones`
 * tienen un esquema real bastante distinto al que se había asumido
 * (confirmado 2026-08-13): `tipo` + `valor` en vez de
 * `descuento_pct`/`descuento_mxn`, más `aplica_a`, `usos_max`,
 * `usos_por_usuario`, `fecha_inicio`/`fecha_fin`, `notas`. `tipo` es
 * texto libre — este formulario asume "porcentaje"/"monto_fijo".
 */
export default async function AdminCuponesPage() {
  await requireStaff();
  const admin = createAdminClient();

  const [{ data: cuponesRaw }, { data: usosRaw }] = await Promise.all([
    admin.from("cupones").select("*").order("creado_en", { ascending: false }),
    admin.from("uso_cupones").select("cupon_id, descuento_mxn"),
  ]);

  const usosPorCupon = new Map<string, { veces: number; totalDescontado: number }>();
  for (const u of usosRaw ?? []) {
    const actual = usosPorCupon.get(u.cupon_id) ?? { veces: 0, totalDescontado: 0 };
    actual.veces += 1;
    actual.totalDescontado += u.descuento_mxn;
    usosPorCupon.set(u.cupon_id, actual);
  }

  const cupones = cuponesRaw ?? [];
  const activos = cupones.filter((c) => c.activo).length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] text-muted">
        {cupones.length} cupones · {activos} activos
      </p>

      <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
              <th className="px-5 py-3.5 font-medium">Código</th>
              <th className="px-5 py-3.5 font-medium">Descuento</th>
              <th className="px-5 py-3.5 font-medium">Aplica a</th>
              <th className="px-5 py-3.5 font-medium">Usos</th>
              <th className="px-5 py-3.5 font-medium">Vigencia</th>
              <th className="px-5 py-3.5 font-medium">Estado</th>
              <th className="px-5 py-3.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {cupones.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[14px] text-muted">
                  No hay cupones todavía.
                </td>
              </tr>
            ) : (
              cupones.map((c) => {
                const uso = usosPorCupon.get(c.id) ?? { veces: 0, totalDescontado: 0 };
                return (
                  <tr key={c.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                    <td className="px-5 py-3.5 font-medium">{c.codigo}</td>
                    <td className="px-5 py-3.5">
                      {c.tipo === "porcentaje" ? `${c.valor}%` : `$${currency.format(c.valor)}`}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{c.aplica_a ?? "—"}</td>
                    <td className="px-5 py-3.5 text-muted">
                      {uso.veces}
                      {c.usos_max ? ` / ${c.usos_max}` : ""}
                    </td>
                    <td className="px-5 py-3.5 text-muted">
                      {c.fecha_inicio ? fechaCorta.format(new Date(`${c.fecha_inicio}T00:00:00`)) : "—"}
                      {" – "}
                      {c.fecha_fin ? fechaCorta.format(new Date(`${c.fecha_fin}T00:00:00`)) : "sin fin"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`pill border ${c.activo ? "border-success text-success" : "border-line text-muted"}`}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <form
                        action={async () => {
                          "use server";
                          await alternarCupon(c.id, !c.activo);
                        }}
                      >
                        <button type="submit" className="text-[12px] text-muted hover:text-cream">
                          {c.activo ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[18px] font-medium text-cream">Crear cupón</p>
      <form
        action={async (formData: FormData) => {
          "use server";
          await crearCupon(formData);
        }}
        className="flex w-full max-w-[700px] flex-col gap-4 rounded-card border border-line bg-surface p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Código">
            <input name="codigo" required placeholder="BIENVENIDA10" className="input uppercase" />
          </Campo>
          <Campo label="Tipo">
            <select name="tipo" className="input" defaultValue="porcentaje">
              <option value="porcentaje">Porcentaje</option>
              <option value="monto_fijo">Monto fijo (MXN)</option>
            </select>
          </Campo>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Valor">
            <input name="valor" type="number" min="0" step="0.01" required placeholder="10" className="input" />
          </Campo>
          <Campo label="Aplica a (opcional)">
            <input name="aplica_a" placeholder="primera_compra" className="input" />
          </Campo>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Usos máximos totales (opcional)">
            <input name="usos_max" type="number" min="1" placeholder="100" className="input" />
          </Campo>
          <Campo label="Usos por cliente (opcional)">
            <input name="usos_por_usuario" type="number" min="1" placeholder="1" className="input" />
          </Campo>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Vigencia desde (opcional)">
            <input name="fecha_inicio" type="date" className="input" />
          </Campo>
          <Campo label="Vigencia hasta (opcional)">
            <input name="fecha_fin" type="date" className="input" />
          </Campo>
        </div>
        <Campo label="Notas (opcional)">
          <input name="notas" placeholder="Campaña de lanzamiento" className="input" />
        </Campo>
        <button type="submit" className="btn-primary w-full rounded-control py-3 text-[14px]">
          Crear cupón
        </button>
      </form>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
