import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarGasto, eliminarGasto, cerrarMesContable, reabrirMesContable } from "../../actions";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "pnl", label: "P&L" },
  { id: "flujo", label: "Flujo de caja" },
  { id: "indicadores", label: "Indicadores" },
  { id: "balance", label: "Balance general" },
  { id: "cxp", label: "Cuentas por pagar" },
  { id: "gastos", label: "Gastos" },
  { id: "pasivo", label: "Pasivo créditos" },
] as const;

const PERIODOS = [
  { id: "mes", label: "Este mes" },
  { id: "trimestre", label: "Trimestre" },
  { id: "semestre", label: "Semestre" },
  { id: "anio", label: "Este año" },
] as const;

/**
 * Finanzas — Figma nodes 206:2, 288:2, 225:2, 227:2, 227:270, 200:2,
 * 201:2, 202:2 (8 pestañas: Resumen/P&L/Flujo de caja/Indicadores/
 * Balance general/Cuentas por pagar/Gastos/Pasivo créditos) +
 * "Registrar gasto" (204:106).
 *
 * El mock de 206:2 (129k caracteres, no cupo en una sola extracción
 * de Figma) es un estado de resultados completo con EBITDA,
 * depreciación, ISR, LTV/CAC/churn, balance general, cuentas por
 * pagar y ROI de marketing por canal — casi todo asume infraestructura
 * que este negocio no tiene: suscripciones recurrentes (HotPot Factor
 * vende paquetes de una sola exhibición, no suscripciones), costo de
 * producción por platillo (no existe columna de costo en `platillos`),
 * depreciación de activos, configuración de impuestos, atribución de
 * marketing por canal, y cuentas por cobrar/pagar.
 *
 * Por decisión explícita del usuario: se reproduce la estructura
 * exacta de las 8 pestañas del Figma, pero cada renglón sin dato real
 * detrás muestra "No disponible" en vez de un número inventado — no
 * hay una sola cifra fabricada en esta página. Lo que SÍ es real y
 * se calcula en vivo: ingresos (compras), gastos (tabla `gastos`),
 * utilidad simple, flujo de caja (100% real porque el negocio cobra
 * al momento por Stripe — no hay diferencia entre devengado y
 * efectivo que modelar), ticket promedio, créditos vendidos vs.
 * consumidos (pasivo), e ingreso por porción entregada.
 */
export default async function AdminFinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; periodo?: string }>;
}) {
  await requireStaff();
  const admin = createAdminClient();
  const { vista = "resumen", periodo = "mes" } = await searchParams;

  const hoy = new Date();
  const finPeriodo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  let inicioPeriodo: Date;
  if (periodo === "trimestre") inicioPeriodo = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
  else if (periodo === "semestre") inicioPeriodo = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
  else if (periodo === "anio") inicioPeriodo = new Date(hoy.getFullYear(), 0, 1);
  else inicioPeriodo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();

  const [
    { data: compras },
    { data: gastos },
    { data: categorias },
    { data: mesContable },
    { data: saldos },
    { count: pedidosEntregados },
    { data: paquetesActivos },
  ] = await Promise.all([
    admin.from("compras").select("monto_mxn, created_at").gte("created_at", inicioPeriodo.toISOString()).lte("created_at", finPeriodo.toISOString()),
    admin
      .from("gastos")
      .select("id, descripcion, monto_mxn, fecha, proveedor, recurrente, categoria_id, categorias_gasto(nombre)")
      .gte("fecha", toISODate(inicioPeriodo))
      .lte("fecha", toISODate(finPeriodo))
      .order("fecha", { ascending: false }),
    admin.from("categorias_gasto").select("id, nombre").order("nombre"),
    admin.from("meses_contables").select("cerrado, cerrado_en").eq("anio", anioActual).eq("mes", mesActual).maybeSingle(),
    admin.from("saldo_creditos").select("usuario_id, saldo, usuarios(nombre)"),
    admin.from("pedidos").select("id", { count: "exact", head: true }).eq("estado", "entregado").gte("fecha_entrega", toISODate(inicioPeriodo)).lte("fecha_entrega", toISODate(finPeriodo)),
    admin.from("paquetes").select("precio_mxn, creditos").eq("activo", true),
  ]);

  type Gasto = {
    id: string;
    descripcion: string;
    monto_mxn: number;
    fecha: string;
    proveedor: string | null;
    recurrente: boolean;
    categoria_id: string | null;
    categorias_gasto: { nombre: string } | null;
  };
  const listaGastos = (gastos ?? []) as unknown as Gasto[];

  const ingresos = (compras ?? []).reduce((acc, c) => acc + c.monto_mxn, 0);
  const totalGastos = listaGastos.reduce((acc, g) => acc + g.monto_mxn, 0);
  const utilidad = ingresos - totalGastos;
  const margen = ingresos > 0 ? Math.round((utilidad / ingresos) * 100) : 0;
  const ticketPromedio = (compras ?? []).length > 0 ? Math.round(ingresos / (compras ?? []).length) : 0;

  const porCategoria = new Map<string, number>();
  for (const g of listaGastos) {
    const nombre = g.categorias_gasto?.nombre ?? "Sin categoría";
    porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + g.monto_mxn);
  }
  const categoriasOrdenadas = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);

  const gastoMarketing = listaGastos.filter((g) => (g.categorias_gasto?.nombre ?? "").toLowerCase().includes("marketing")).reduce((a, g) => a + g.monto_mxn, 0);

  const saldoTotal = (saldos ?? []).reduce((acc, s) => acc + s.saldo, 0);
  const clientesConSaldo = (saldos ?? []).filter((s) => s.saldo > 0);
  const entregadas = pedidosEntregados ?? 0;
  const ingresoPorPorcion = entregadas > 0 ? Math.round(ingresos / entregadas) : 0;
  // Mismo cálculo que A0 y Clientes: precio promedio ponderado por
  // crédito entre los paquetes activos, para no inventar un factor.
  const creditosTotalesPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.creditos, 0);
  const precioTotalPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.precio_mxn, 0);
  const precioPromedioPorCredito = creditosTotalesPaq > 0 ? precioTotalPaq / creditosTotalesPaq : 0;
  const valorPasivoEstimado = Math.round(saldoTotal * precioPromedioPorCredito);

  const qs = (params: Record<string, string>) => {
    const merged = { vista, periodo, ...params };
    return `/admin/finanzas?${new URLSearchParams(merged).toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-control border border-line bg-surface p-1">
          {PERIODOS.map((p) => (
            <a
              key={p.id}
              href={qs({ periodo: p.id })}
              className={`rounded-control px-3.5 py-2 text-[13px] font-medium ${
                periodo === p.id ? "bg-raised text-gold" : "text-muted hover:text-cream"
              }`}
            >
              {p.label}
            </a>
          ))}
        </div>
        {(mesContable?.cerrado ?? false) && <span className="pill border border-success text-success">Mes cerrado</span>}
      </div>

      <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={qs({ vista: t.id })}
            className={`shrink-0 rounded-control px-3.5 py-2 text-[13px] font-medium ${
              vista === t.id ? "border border-gold bg-raised text-gold" : "text-muted hover:text-cream"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {vista === "resumen" && (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi etiqueta="INGRESOS" valor={`$${currency.format(ingresos)}`} nota="cobrado por Stripe" destacado />
            <Kpi etiqueta="GASTOS" valor={`$${currency.format(totalGastos)}`} nota={`${listaGastos.length} registrados`} />
            <Kpi etiqueta="UTILIDAD" valor={`$${currency.format(utilidad)}`} nota={`margen ${margen}%`} />
            <Kpi etiqueta="CRÉDITOS PENDIENTES" valor={String(saldoTotal)} nota="vendidos sin consumir" />
          </div>
          <NoDisponible titulo="Metas del mes" detalle="No hay tabla de metas/presupuesto configurada en la base de datos — esta sección del diseño (ingreso meta, margen meta, gasto operativo máx., etc.) necesitaría una tabla nueva de objetivos mensuales." />
          <p className="text-[18px] font-medium text-cream">Gastos por categoría</p>
          <CategoriasGrid categorias={categoriasOrdenadas} />
        </>
      )}

      {vista === "pnl" && (
        <div className="flex max-w-[700px] flex-col gap-1 rounded-card border border-line bg-surface p-6">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[1px] text-gold">Estado de resultados</p>
          <PnlRow label="Ingresos (compras cobradas)" valor={ingresos} />
          <PnlRow label="Gastos operativos" valor={-totalGastos} />
          <PnlDiv />
          <PnlRow label="Utilidad" valor={utilidad} fuerte />
          <PnlDiv />
          <NoDisponible
            titulo="Costo de producción, depreciación e ISR"
            detalle="El Figma incluye costo de producción por platillo, depreciación de equipo, EBITDA/EBIT e ISR — ninguno existe en el esquema real (no hay costo por platillo, ni tabla de activos fijos, ni configuración de impuestos)."
          />
        </div>
      )}

      {vista === "flujo" && (
        <div className="flex max-w-[700px] flex-col gap-1 rounded-card border border-line bg-surface p-6">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[1px] text-gold">Flujo de caja</p>
          <p className="mb-2 text-[12px] text-muted">
            100% real: el negocio cobra al momento con Stripe, así que no hay diferencia entre devengado y efectivo que calcular aquí.
          </p>
          <PnlRow label="Entradas de efectivo" valor={ingresos} />
          <PnlRow label="Salidas de efectivo" valor={-totalGastos} />
          <PnlDiv />
          <PnlRow label="Flujo neto del período" valor={utilidad} fuerte />
        </div>
      )}

      {vista === "indicadores" && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi etiqueta="TICKET PROMEDIO" valor={`$${currency.format(ticketPromedio)}`} nota="por compra" />
          <Kpi etiqueta="INGRESO POR PORCIÓN" valor={`$${currency.format(ingresoPorPorcion)}`} nota={`${entregadas} porciones entregadas`} />
          <Kpi
            etiqueta="CAC (marketing)"
            valor={gastoMarketing > 0 ? `$${currency.format(gastoMarketing)} gastado` : "—"}
            nota={gastoMarketing > 0 ? "gasto en categoría Marketing" : "sin gastos de categoría Marketing"}
          />
          <div className="col-span-full">
            <NoDisponible
              titulo="LTV, churn, break-even y capacidad de producción"
              detalle="Requieren datos que no existen todavía: historial de cancelación de clientes (churn), capacidad máxima de producción configurada, y costos fijos para calcular el punto de equilibrio."
            />
          </div>
        </div>
      )}

      {vista === "balance" && (
        <NoDisponible
          titulo="Balance general"
          detalle="No hay ningún activo, pasivo ni capital registrado en la base de datos — este negocio no lleva contabilidad de balance todavía (solo ingresos por compras y gastos operativos). Construir esto necesitaría tablas nuevas de activos fijos, cuentas bancarias y capital."
        />
      )}

      {vista === "cxp" && (
        <NoDisponible
          titulo="Cuentas por pagar"
          detalle="`gastos` no tiene un estatus de pagado/pendiente ni fecha de vencimiento — todo gasto registrado se asume ya pagado. Para cuentas por pagar reales haría falta agregar esas columnas."
        />
      )}

      {vista === "gastos" && (
        <>
          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Fecha</th>
                  <th className="px-5 py-3.5 font-medium">Descripción</th>
                  <th className="px-5 py-3.5 font-medium">Categoría</th>
                  <th className="px-5 py-3.5 font-medium">Proveedor</th>
                  <th className="px-5 py-3.5 font-medium">Monto</th>
                  <th className="px-5 py-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {listaGastos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-muted">
                      Sin gastos registrados en este período.
                    </td>
                  </tr>
                ) : (
                  listaGastos.map((g) => (
                    <tr key={g.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                      <td className="px-5 py-3.5">{fechaCorta.format(new Date(`${g.fecha}T00:00:00`))}</td>
                      <td className="px-5 py-3.5">
                        {g.descripcion}
                        {g.recurrente && <span className="ml-2 badge bg-gold/15 text-gold">Recurrente</span>}
                      </td>
                      <td className="px-5 py-3.5 text-muted">{g.categorias_gasto?.nombre ?? "—"}</td>
                      <td className="px-5 py-3.5 text-muted">{g.proveedor ?? "—"}</td>
                      <td className="px-5 py-3.5">${currency.format(g.monto_mxn)}</td>
                      <td className="px-5 py-3.5">
                        <form
                          action={async () => {
                            "use server";
                            await eliminarGasto(g.id);
                          }}
                        >
                          <button type="submit" className="text-[12px] text-muted hover:text-danger">
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[18px] font-medium text-cream">Registrar gasto</p>
          <form
            action={async (formData: FormData) => {
              "use server";
              await registrarGasto(formData);
            }}
            className="flex w-full max-w-[700px] flex-col gap-4 rounded-card border border-line bg-surface p-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Descripción">
                <input name="descripcion" required placeholder="Meta Ads — campaña septiembre" className="input" />
              </Campo>
              <Campo label="Monto (MXN)">
                <input name="monto_mxn" type="number" min="0" step="0.01" required placeholder="1200" className="input" />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Categoría">
                <select name="categoria_id" className="input">
                  <option value="">Sin categoría</option>
                  {(categorias ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Fecha">
                <input name="fecha" type="date" required defaultValue={toISODate(hoy)} className="input" />
              </Campo>
            </div>
            <Campo label="Proveedor / plataforma (opcional)">
              <input name="proveedor" placeholder="Meta Platforms" className="input" />
            </Campo>
            <label className="flex items-center gap-2.5 text-[14px] text-cream">
              <input type="checkbox" name="recurrente" className="size-[16px]" />
              Gasto recurrente mensual
            </label>
            <button type="submit" className="btn-primary w-full rounded-control py-3 text-[14px]">
              Guardar gasto
            </button>
          </form>

          <p className="text-[18px] font-medium text-cream">Cierre mensual</p>
          <div className="flex max-w-[560px] flex-col gap-3 rounded-card border border-line bg-surface p-6">
            <p className="text-[13px] text-muted">
              {mesContable?.cerrado
                ? `${anioActual}-${pad(mesActual)} cerrado${mesContable.cerrado_en ? ` el ${fechaCorta.format(new Date(mesContable.cerrado_en))}` : ""}.`
                : `${anioActual}-${pad(mesActual)} sigue abierto.`}
            </p>
            {mesContable?.cerrado ? (
              <form
                action={async () => {
                  "use server";
                  await reabrirMesContable(anioActual, mesActual);
                }}
              >
                <button type="submit" className="btn-secondary rounded-control px-6 py-3 text-[14px]">
                  Reabrir mes
                </button>
              </form>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await cerrarMesContable(anioActual, mesActual);
                }}
              >
                <button type="submit" className="btn-primary rounded-control px-6 py-3 text-[14px]">
                  Cerrar mes
                </button>
              </form>
            )}
          </div>
        </>
      )}

      {vista === "pasivo" && (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi etiqueta="CRÉDITOS SIN CONSUMIR" valor={String(saldoTotal)} nota={`${clientesConSaldo.length} clientes con saldo`} destacado />
            <Kpi etiqueta="VALOR ESTIMADO" valor={`$${currency.format(valorPasivoEstimado)}`} nota="créditos × precio prom. por crédito" />
            <Kpi etiqueta="INGRESOS DEL PERÍODO" valor={`$${currency.format(ingresos)}`} nota="ya cobrados en Stripe" />
          </div>
          <p className="text-[18px] font-medium text-cream">Clientes con créditos pendientes</p>
          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[400px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Cliente</th>
                  <th className="px-5 py-3.5 font-medium">Créditos</th>
                </tr>
              </thead>
              <tbody>
                {clientesConSaldo.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-8 text-center text-[14px] text-muted">
                      Ningún cliente tiene créditos pendientes.
                    </td>
                  </tr>
                ) : (
                  clientesConSaldo
                    .sort((a, b) => b.saldo - a.saldo)
                    .map((s) => (
                      <tr key={s.usuario_id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                        <td className="px-5 py-3">{(s.usuarios as unknown as { nombre: string } | null)?.nombre ?? "—"}</td>
                        <td className="px-5 py-3">{s.saldo}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ etiqueta, valor, nota, destacado }: { etiqueta: string; valor: string; nota: string; destacado?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 rounded-card border px-5 py-5 ${destacado ? "border-[1.5px] border-gold bg-raised" : "border-line bg-surface"}`}>
      <p className="text-[9px] font-medium tracking-[0.9px] text-gold">{etiqueta}</p>
      <p className="font-display text-[26px] font-semibold text-cream">{valor}</p>
      <p className="text-[12px] text-muted">{nota}</p>
    </div>
  );
}

function CategoriasGrid({ categorias }: { categorias: [string, number][] }) {
  if (categorias.length === 0) return <p className="text-[13px] text-muted">Sin gastos registrados en este período.</p>;
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categorias.map(([nombre, monto]) => (
        <div key={nombre} className="flex flex-col gap-1.5 rounded-card border border-line bg-surface px-5 py-4">
          <p className="text-[10px] font-medium tracking-[0.8px] text-gold">{nombre.toUpperCase()}</p>
          <p className="font-display text-[22px] font-semibold text-cream">${currency.format(monto)}</p>
        </div>
      ))}
    </div>
  );
}

function PnlRow({ label, valor, fuerte }: { label: string; valor: number; fuerte?: boolean }) {
  const negativo = valor < 0;
  return (
    <div className={`flex items-center justify-between py-2.5 ${fuerte ? "text-[16px] font-medium text-cream" : "text-[14px] text-cream"}`}>
      <p>{label}</p>
      <p className={negativo ? "text-danger" : fuerte ? "text-gold" : "text-cream"}>
        {negativo ? "– " : ""}${currency.format(Math.abs(valor))}
      </p>
    </div>
  );
}

function PnlDiv() {
  return <div className="h-px w-full bg-line" />;
}

function NoDisponible({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-dashed border-line/70 bg-transparent px-5 py-4">
      <p className="text-[13px] font-medium text-muted">{titulo} — no disponible</p>
      <p className="text-[12px] leading-[18px] text-muted/80">{detalle}</p>
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
