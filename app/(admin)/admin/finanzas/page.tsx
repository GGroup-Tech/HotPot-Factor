import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GastoForm,
  GastoEliminarBoton,
  GastoPagadoBoton,
  CierreMesBoton,
  ConfiguracionForm,
  MetaMensualForm,
  ActivoFijoForm,
  ActivoFijoActivoBoton,
  CuentaBancariaForm,
  CuentaBancariaFila,
  MovimientoCapitalForm,
  MovimientoCapitalEliminarBoton,
} from "./FinanzasClientForms";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Meses de un activo fijo ya depreciados hasta `hasta` (sin pasar de su vida útil). */
function mesesTranscurridos(fechaCompra: Date, hasta: Date) {
  let meses = (hasta.getFullYear() - fechaCompra.getFullYear()) * 12 + (hasta.getMonth() - fechaCompra.getMonth());
  if (hasta.getDate() < fechaCompra.getDate()) meses -= 1;
  return Math.max(0, meses);
}
/** Lista de meses (año+mes) entre `inicio` y `fin`, inclusive por mes calendario. */
function mesesEntre(inicio: Date, fin: Date): { anio: number; mesNum: number }[] {
  const meses: { anio: number; mesNum: number }[] = [];
  let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const finCursor = new Date(fin.getFullYear(), fin.getMonth(), 1);
  while (cursor <= finCursor) {
    meses.push({ anio: cursor.getFullYear(), mesNum: cursor.getMonth() + 1 });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return meses;
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
 * 201:2, 202:2 (8 pestañas). Ampliado 2026-08-13 a petición del
 * usuario: se agregaron 5 tablas nuevas (metas_mensuales,
 * activos_fijos, configuracion_financiera, cuentas_bancarias,
 * capital_movimientos) + columnas (`platillos.costo_mxn`,
 * `gastos.pagado`/`fecha_vencimiento`, `usuarios.desactivado_en`) para
 * reemplazar los bloques "no disponible" por cálculos reales.
 *
 * Ampliado de nuevo 2026-08-19: pestaña "Flujo de caja" ahora incluye
 * una gráfica de barras (entradas vs. salidas por mes, CSS puro, sin
 * librería — mismo criterio que las estadísticas de Clientes). Se
 * reusan `compras`/`gastos` que ya se traían para el período
 * seleccionado, solo se agrupan por mes en vez de sumarse en un único
 * total. El rango de meses de la gráfica sigue al selector de período
 * de arriba (Este mes / Trimestre / Semestre / Este año) — no es un
 * control aparte.
 *
 * Sigue vigente la regla de esta página: ningún número inventado. Lo
 * que todavía no tiene dato de respaldo real (p.ej. ISR sin
 * configurar) se marca explícitamente en vez de mostrar un placeholder
 * silencioso.
 *
 * Nota metodológica importante: "Ingresos" en todo el archivo sigue
 * siendo caja cobrada (compras del período), no ingreso devengado por
 * platillo entregado — así estaba antes y se mantiene por
 * consistencia. El costo de producción, en cambio, sí se mide por
 * platillos ENTREGADOS en el período (devengado). Es una mezcla
 * cash/accrual deliberada por simplicidad; se documenta para que no
 * se lea como un descuadre.
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
    { data: configRaw },
    { data: metaMes },
    { data: activosFijos },
    { data: cuentasBancarias },
    { data: capitalMovimientos },
    { data: gastosPendientes },
    { data: pedidosPeriodoConCosto },
    { data: comprasHistorico },
    { data: gastosHistorico },
    { data: pedidosHistoricoConCosto },
    { data: usuariosTodos },
    { data: comprasConPaquete },
    { data: platillosActivos },
  ] = await Promise.all([
    // `creado_en`, no `created_at` — confirmado 2026-08-19 vía
    // information_schema (ver auditoría de Finanzas).
    admin
      .from("compras")
      .select("monto_mxn, creado_en, paquetes(nombre)")
      .gte("creado_en", inicioPeriodo.toISOString())
      .lte("creado_en", finPeriodo.toISOString()),
    admin
      .from("gastos")
      .select("id, descripcion, monto_mxn, fecha, proveedor, recurrente, pagado, fecha_vencimiento, categoria_id, categorias_gasto(nombre)")
      .gte("fecha", toISODate(inicioPeriodo))
      .lte("fecha", toISODate(finPeriodo))
      .order("fecha", { ascending: false }),
    admin.from("categorias_gasto").select("id, nombre").order("nombre"),
    admin.from("meses_contables").select("cerrado, cerrado_en").eq("anio", anioActual).eq("mes", mesActual).maybeSingle(),
    admin.from("saldo_creditos").select("usuario_id, saldo, usuarios(nombre)"),
    admin.from("pedidos").select("id", { count: "exact", head: true }).eq("estado", "entregado").gte("fecha_entrega", toISODate(inicioPeriodo)).lte("fecha_entrega", toISODate(finPeriodo)),
    admin.from("paquetes").select("precio_mxn, creditos").eq("activo", true),
    admin.from("configuracion_financiera").select("isr_tasa_pct, capacidad_produccion_diaria").order("actualizado_en", { ascending: false }).limit(1).maybeSingle(),
    admin.from("metas_mensuales").select("ingreso_meta_mxn, margen_meta_pct, gasto_operativo_max_mxn").eq("anio", anioActual).eq("mes", mesActual).maybeSingle(),
    admin.from("activos_fijos").select("id, nombre, valor_compra_mxn, fecha_compra, vida_util_meses, activo").order("fecha_compra", { ascending: false }),
    admin.from("cuentas_bancarias").select("id, nombre, saldo_mxn").order("nombre"),
    admin.from("capital_movimientos").select("id, tipo, monto_mxn, fecha, nota").order("fecha", { ascending: false }),
    admin.from("gastos").select("id, descripcion, monto_mxn, proveedor, fecha_vencimiento").eq("pagado", false).order("fecha_vencimiento", { ascending: true }),
    admin.from("pedidos").select("platillo_id, platillos(costo_mxn)").eq("estado", "entregado").gte("fecha_entrega", toISODate(inicioPeriodo)).lte("fecha_entrega", toISODate(finPeriodo)),
    admin.from("compras").select("monto_mxn"),
    admin.from("gastos").select("monto_mxn"),
    admin.from("pedidos").select("platillo_id, platillos(costo_mxn)").eq("estado", "entregado"),
    admin.from("usuarios").select("id, creado_en, activo, desactivado_en, como_nos_conocio"),
    // `compras.creditos` guarda un snapshot de los créditos otorgados
    // AL MOMENTO de esa compra (confirmado 2026-08-19 vía
    // information_schema — la columna sí existe, NOT NULL). Se usa
    // directo en vez de unir con `paquetes(creditos)`, porque ese join
    // trae el valor ACTUAL del paquete — si algún día editas cuántos
    // créditos trae un paquete, el join distorsionaría retroactivamente
    // el pasivo histórico de todos los clientes que compraron antes.
    admin.from("compras").select("usuario_id, monto_mxn, creditos"),
    admin.from("platillos").select("costo_mxn").eq("activo", true),
  ]);

  type Gasto = {
    id: string;
    descripcion: string;
    monto_mxn: number;
    fecha: string;
    proveedor: string | null;
    recurrente: boolean;
    pagado: boolean;
    fecha_vencimiento: string | null;
    categoria_id: string | null;
    categorias_gasto: { nombre: string } | null;
  };
  const listaGastos = (gastos ?? []) as unknown as Gasto[];

  type CompraConPaquete = { monto_mxn: number; creado_en: string | null; paquetes: { nombre: string } | null };
  const listaCompras = (compras ?? []) as unknown as CompraConPaquete[];

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

  // Coincide contra varios sinónimos (no solo "marketing") porque el
  // nombre de la categoría es texto libre capturado por el admin —
  // auditoría 2026-08-19: con un solo término, una categoría llamada
  // "Publicidad" o "Mercadotecnia" hacía que el CAC se viera como "sin
  // gastos" sin ningún aviso. Sigue siendo un match de texto (no hay
  // columna `es_marketing` en `categorias_gasto`), así que un nombre
  // fuera de esta lista todavía puede quedar sin detectar.
  const PALABRAS_MARKETING = ["marketing", "mercadotecnia", "publicidad", "ads", "anuncio"];
  const gastoMarketing = listaGastos
    .filter((g) => {
      const nombre = (g.categorias_gasto?.nombre ?? "").toLowerCase();
      return PALABRAS_MARKETING.some((palabra) => nombre.includes(palabra));
    })
    .reduce((a, g) => a + g.monto_mxn, 0);

  // ---------- CAC y clientes nuevos por canal ----------
  // Agregado 2026-08-14 a partir de `usuarios.como_nos_conocio`
  // (capturado en el registro). El CAC ahora sí es gasto entre
  // clientes nuevos del período — antes solo mostraba el gasto total
  // de marketing, que no es un CAC real. No se reparte el gasto por
  // canal porque `gastos` no tiene esa granularidad — es gasto total
  // de marketing entre TODOS los clientes nuevos, sin importar canal.
  const nuevosClientesPeriodo = (usuariosTodos ?? []).filter(
    (u) => u.creado_en && new Date(u.creado_en) >= inicioPeriodo && new Date(u.creado_en) <= finPeriodo,
  ).length;
  const cacReal = nuevosClientesPeriodo > 0 && gastoMarketing > 0 ? gastoMarketing / nuevosClientesPeriodo : null;

  const porCanal = new Map<string, number>();
  for (const u of usuariosTodos ?? []) {
    if (!u.creado_en) continue;
    const fecha = new Date(u.creado_en);
    if (fecha < inicioPeriodo || fecha > finPeriodo) continue;
    const canal = u.como_nos_conocio?.trim() || "Sin especificar";
    porCanal.set(canal, (porCanal.get(canal) ?? 0) + 1);
  }
  const canalesOrdenados = [...porCanal.entries()].sort((a, b) => b[1] - a[1]);

  const saldoTotal = (saldos ?? []).reduce((acc, s) => acc + s.saldo, 0);
  const clientesConSaldo = (saldos ?? []).filter((s) => s.saldo > 0);
  const entregadas = pedidosEntregados ?? 0;
  const ingresoPorPorcion = entregadas > 0 ? Math.round(ingresos / entregadas) : 0;
  const creditosTotalesPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.creditos, 0);
  const precioTotalPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.precio_mxn, 0);
  const precioPromedioPorCredito = creditosTotalesPaq > 0 ? precioTotalPaq / creditosTotalesPaq : 0;

  // ---------- Pasivo de créditos: precio ponderado POR CLIENTE ----------
  // En vez de un promedio global de paquetes activos, se usa el precio
  // real que cada cliente pagó por sus créditos (histórico de sus
  // compras), porque el pasivo es lo que YA se le cobró, no un precio
  // de catálogo actual que puede haber cambiado.
  const comprasPorUsuarioPasivo = new Map<string, { montoTotal: number; creditosTotal: number }>();
  for (const c of comprasConPaquete ?? []) {
    const creditos = c.creditos ?? 0;
    const acc = comprasPorUsuarioPasivo.get(c.usuario_id) ?? { montoTotal: 0, creditosTotal: 0 };
    acc.montoTotal += c.monto_mxn;
    acc.creditosTotal += creditos;
    comprasPorUsuarioPasivo.set(c.usuario_id, acc);
  }
  let valorPasivoEstimado = 0;
  const clientesConSaldoDetalle = clientesConSaldo.map((s) => {
    const hist = comprasPorUsuarioPasivo.get(s.usuario_id);
    const precioPonderado = hist && hist.creditosTotal > 0 ? hist.montoTotal / hist.creditosTotal : precioPromedioPorCredito;
    const valor = Math.round(s.saldo * precioPonderado);
    valorPasivoEstimado += valor;
    return { ...s, precioPonderado, valor };
  });

  // ---------- Configuración financiera ----------
  const isrTasaPct = configRaw?.isr_tasa_pct ?? null;
  const capacidadDiaria = configRaw?.capacidad_produccion_diaria ?? null;

  // ---------- Costo de producción (real, por platillos entregados) ----------
  const costoProduccionPeriodo = (pedidosPeriodoConCosto ?? []).reduce(
    (acc, p) => acc + ((p.platillos as unknown as { costo_mxn: number | null } | null)?.costo_mxn ?? 0),
    0,
  );
  const utilidadBruta = ingresos - costoProduccionPeriodo;

  // ---------- Depreciación (real, de activos_fijos) ----------
  // Corregido 2026-08-19 (auditoría): la versión anterior cargaba
  // `mesesEnPeriodo` completos de depreciación con tal de que quedara
  // vida útil, sin importar si el activo se compró A MITAD del
  // período — un activo comprado el día 28 dentro de "Este mes"
  // restaba igual 1 mes completo de depreciación por solo 2-3 días de
  // posesión real. Ahora se calcula como la DIFERENCIA entre la
  // depreciación acumulada al final del período y al inicio, que
  // automáticamente da ~0 para un activo recién comprado a mitad de
  // período y reparte el resto en los períodos siguientes.
  function depreciacionAcumuladaAsOf(
    a: { valor_compra_mxn: number; fecha_compra: string; vida_util_meses: number },
    hasta: Date,
  ): number {
    const fechaCompra = new Date(`${a.fecha_compra}T00:00:00`);
    const mensual = a.valor_compra_mxn / a.vida_util_meses;
    const mesesElapsed = Math.min(a.vida_util_meses, mesesTranscurridos(fechaCompra, hasta));
    return mensual * mesesElapsed;
  }
  const activosActivos = (activosFijos ?? []).filter((a) => a.activo);
  let depreciacionPeriodo = 0;
  for (const a of activosActivos) {
    const acumuladaAlInicio = depreciacionAcumuladaAsOf(a, inicioPeriodo);
    const acumuladaAlFin = depreciacionAcumuladaAsOf(a, finPeriodo);
    depreciacionPeriodo += Math.max(0, acumuladaAlFin - acumuladaAlInicio);
  }

  // ---------- Cascada de P&L ----------
  const ebit = utilidadBruta - totalGastos - depreciacionPeriodo;
  const ebitda = ebit + depreciacionPeriodo;
  const isrPeriodo = isrTasaPct != null && ebit > 0 ? ebit * (isrTasaPct / 100) : 0;
  const utilidadNeta = ebit - isrPeriodo;

  // ---------- Indicadores: LTV, churn, break-even, capacidad ----------
  const ingresosHistoricoTotal = (comprasHistorico ?? []).reduce((acc, c) => acc + c.monto_mxn, 0);
  const clientesConCompraTotal = comprasPorUsuarioPasivo.size;
  const ltv = clientesConCompraTotal > 0 ? Math.round(ingresosHistoricoTotal / clientesConCompraTotal) : 0;

  const clientesBaseChurn = (usuariosTodos ?? []).filter((u) => u.creado_en && new Date(u.creado_en) < inicioPeriodo).length;
  const clientesDesactivadosPeriodo = (usuariosTodos ?? []).filter(
    (u) => u.desactivado_en && new Date(u.desactivado_en) >= inicioPeriodo && new Date(u.desactivado_en) <= finPeriodo,
  ).length;
  const churnPct = clientesBaseChurn > 0 ? Math.round((clientesDesactivadosPeriodo / clientesBaseChurn) * 1000) / 10 : null;

  const costoProduccionPromedioPorcion =
    entregadas > 0
      ? costoProduccionPeriodo / entregadas
      : (platillosActivos ?? []).length > 0
        ? (platillosActivos ?? []).reduce((acc, p) => acc + (p.costo_mxn ?? 0), 0) / (platillosActivos ?? []).length
        : 0;
  const margenContribucionPorcion = precioPromedioPorCredito - costoProduccionPromedioPorcion;
  const costosFijosPeriodo = totalGastos + depreciacionPeriodo;
  const breakEvenPorciones = margenContribucionPorcion > 0 ? Math.ceil(costosFijosPeriodo / margenContribucionPorcion) : null;
  const breakEvenMxn = breakEvenPorciones != null ? Math.round(breakEvenPorciones * precioPromedioPorCredito) : null;

  const diasEnPeriodo = Math.round((finPeriodo.getTime() - inicioPeriodo.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const promedioPorcionesDiarias = diasEnPeriodo > 0 ? entregadas / diasEnPeriodo : 0;
  const utilizacionCapacidadPct = capacidadDiaria && capacidadDiaria > 0 ? Math.round((promedioPorcionesDiarias / capacidadDiaria) * 100) : null;

  // ---------- Balance general ----------
  const totalBancos = (cuentasBancarias ?? []).reduce((acc, c) => acc + c.saldo_mxn, 0);
  let totalActivosFijosNetos = 0;
  for (const a of activosActivos) {
    const fechaCompra = new Date(`${a.fecha_compra}T00:00:00`);
    const mensual = a.valor_compra_mxn / a.vida_util_meses;
    const mesesDeprecHoy = Math.min(mesesTranscurridos(fechaCompra, hoy), a.vida_util_meses);
    const depreciacionAcumulada = mensual * mesesDeprecHoy;
    totalActivosFijosNetos += Math.max(0, a.valor_compra_mxn - depreciacionAcumulada);
  }
  const totalActivos = totalBancos + totalActivosFijosNetos;

  const totalCxP = (gastosPendientes ?? []).reduce((acc, g) => acc + g.monto_mxn, 0);
  const totalPasivos = totalCxP + valorPasivoEstimado;

  const aportacionesNetas = (capitalMovimientos ?? []).reduce(
    (acc, m) => acc + (m.tipo === "retiro" ? -m.monto_mxn : m.monto_mxn),
    0,
  );
  const costoProduccionHistoricoTotal = (pedidosHistoricoConCosto ?? []).reduce(
    (acc, p) => acc + ((p.platillos as unknown as { costo_mxn: number | null } | null)?.costo_mxn ?? 0),
    0,
  );
  const gastosHistoricoTotal = (gastosHistorico ?? []).reduce((acc, g) => acc + g.monto_mxn, 0);
  const utilidadAcumulada = ingresosHistoricoTotal - gastosHistoricoTotal - costoProduccionHistoricoTotal;
  const totalCapital = aportacionesNetas + utilidadAcumulada;
  const diferenciaNoConciliada = totalActivos - totalPasivos - totalCapital;

  // ---------- Flujo de caja por mes (para la gráfica de barras) ----------
  // Reusa `compras`/`listaGastos`, que ya vienen acotados al período
  // seleccionado — aquí solo se agrupan por mes calendario en vez de
  // sumarse en un único total. El rango de meses sigue al selector de
  // período de arriba (Este mes = 1 barra, Trimestre = 3, etc.).
  const ingresosPorMes = new Map<string, number>();
  for (const c of compras ?? []) {
    // `creado_en` es nullable en el esquema real — en la práctica
    // siempre lo llena el DEFAULT now() de la base, pero una compra
    // sin fecha no se puede ubicar en ningún mes, así que se omite.
    if (!c.creado_en) continue;
    const fecha = new Date(c.creado_en);
    const key = `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}`;
    ingresosPorMes.set(key, (ingresosPorMes.get(key) ?? 0) + c.monto_mxn);
  }
  const gastosPorMesMap = new Map<string, number>();
  for (const g of listaGastos) {
    const fecha = new Date(`${g.fecha}T00:00:00`);
    const key = `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}`;
    gastosPorMesMap.set(key, (gastosPorMesMap.get(key) ?? 0) + g.monto_mxn);
  }
  const flujoPorMes = mesesEntre(inicioPeriodo, finPeriodo).map(({ anio, mesNum }) => {
    const key = `${anio}-${pad(mesNum)}`;
    return {
      etiqueta: `${MESES_CORTO[mesNum - 1]} ${anio}`,
      ingresos: ingresosPorMes.get(key) ?? 0,
      gastos: gastosPorMesMap.get(key) ?? 0,
    };
  });

  // ---------- Desglose de entradas/salidas del período ----------
  // Entradas: por paquete comprado (`ingresos` ya es cash cobrado por
  // Stripe, aquí solo se reparte por qué se cobró). Salidas: reusa
  // `categoriasOrdenadas`, que ya se calcula arriba para el Resumen —
  // no es un cálculo nuevo, solo se muestra también aquí con el
  // desglose visual (dona) en vez de solo tarjetas.
  const ingresosPorPaquete = new Map<string, number>();
  for (const c of listaCompras) {
    const nombre = c.paquetes?.nombre ?? "Sin paquete";
    ingresosPorPaquete.set(nombre, (ingresosPorPaquete.get(nombre) ?? 0) + c.monto_mxn);
  }
  const ingresosPorPaqueteOrdenados = [...ingresosPorPaquete.entries()].sort((a, b) => b[1] - a[1]);

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
            <Kpi
              etiqueta="UTILIDAD (CAJA)"
              valor={`$${currency.format(utilidad)}`}
              nota={`margen ${margen}% · ingresos − gastos, sin costo de producción ni ISR — ve a P&L para la utilidad neta real`}
            />
            <Kpi etiqueta="CRÉDITOS PENDIENTES" valor={String(saldoTotal)} nota="vendidos sin consumir" />
          </div>

          <p className="text-[18px] font-medium text-cream">Meta del mes ({anioActual}-{pad(mesActual)})</p>
          {metaMes && (metaMes.ingreso_meta_mxn != null || metaMes.margen_meta_pct != null || metaMes.gasto_operativo_max_mxn != null) && (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
              {metaMes.ingreso_meta_mxn != null && (
                <Kpi
                  etiqueta="INGRESO VS. META"
                  valor={`$${currency.format(ingresos)} / $${currency.format(metaMes.ingreso_meta_mxn)}`}
                  nota={ingresos >= metaMes.ingreso_meta_mxn ? "meta alcanzada" : `faltan $${currency.format(metaMes.ingreso_meta_mxn - ingresos)}`}
                />
              )}
              {metaMes.margen_meta_pct != null && (
                <Kpi
                  etiqueta="MARGEN VS. META"
                  valor={`${margen}% / ${metaMes.margen_meta_pct}%`}
                  nota={margen >= metaMes.margen_meta_pct ? "meta alcanzada" : "por debajo de la meta"}
                />
              )}
              {metaMes.gasto_operativo_max_mxn != null && (
                <Kpi
                  etiqueta="GASTO VS. TOPE"
                  valor={`$${currency.format(totalGastos)} / $${currency.format(metaMes.gasto_operativo_max_mxn)}`}
                  nota={totalGastos <= metaMes.gasto_operativo_max_mxn ? "dentro del tope" : "excedido"}
                />
              )}
            </div>
          )}
          <MetaMensualForm
            anio={anioActual}
            mes={mesActual}
            ingresoMetaActual={metaMes?.ingreso_meta_mxn ?? null}
            margenMetaActual={metaMes?.margen_meta_pct ?? null}
            gastoMaxActual={metaMes?.gasto_operativo_max_mxn ?? null}
          />

          <p className="text-[18px] font-medium text-cream">Gastos por categoría</p>
          <CategoriasGrid categorias={categoriasOrdenadas} />
        </>
      )}

      {vista === "pnl" && (
        <div className="flex max-w-[700px] flex-col gap-1 rounded-card border border-line bg-surface p-6">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[1px] text-gold">Estado de resultados</p>
          <PnlRow label="Ingresos (compras cobradas)" valor={ingresos} />
          <PnlRow label="Costo de producción (platillos entregados)" valor={-costoProduccionPeriodo} />
          <PnlDiv />
          <PnlRow label="Utilidad bruta" valor={utilidadBruta} fuerte />
          <PnlDiv />
          <PnlRow label="Gastos operativos" valor={-totalGastos} />
          <PnlRow label="Depreciación" valor={-depreciacionPeriodo} />
          <PnlDiv />
          <PnlRow label="EBIT" valor={ebit} fuerte />
          <PnlRow label="+ Depreciación" valor={depreciacionPeriodo} />
          <PnlRow label="EBITDA" valor={ebitda} fuerte />
          <PnlDiv />
          {isrTasaPct != null ? (
            <>
              <PnlRow label={`ISR (${isrTasaPct}% sobre EBIT positivo)`} valor={-isrPeriodo} />
              <PnlDiv />
              <PnlRow label="Utilidad neta" valor={utilidadNeta} fuerte />
            </>
          ) : (
            <NoDisponible
              titulo="ISR y utilidad neta"
              detalle="No has configurado una tasa de ISR todavía. Ve a la pestaña Indicadores para capturarla — en cuanto la guardes, este renglón se calcula solo."
            />
          )}
          <p className="mt-2 text-[11px] leading-[16px] text-muted/70">
            Los activos con costo de producción o valor de compra sin capturar no aportan a estos cálculos (se tratan como $0, no se
            excluyen del conteo).
          </p>
        </div>
      )}

      {vista === "flujo" && (
        <>
          <FlujoBarras filas={flujoPorMes} />

          <p className="text-[18px] font-medium text-cream">Desglose del período</p>
          <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
            <DonaFinanzas
              titulo="Entradas por paquete"
              filas={ingresosPorPaqueteOrdenados.map(([etiqueta, valor]) => ({ etiqueta, valor }))}
              vacio="Sin compras en este período."
            />
            <DonaFinanzas
              titulo="Salidas por categoría"
              filas={categoriasOrdenadas.map(([etiqueta, valor]) => ({ etiqueta, valor }))}
              vacio="Sin gastos en este período."
            />
          </div>

          <div className="flex max-w-[700px] flex-col gap-1 rounded-card border border-line bg-surface p-6">
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[1px] text-gold">Flujo de caja — total del período</p>
            <p className="mb-2 text-[12px] text-muted">
              100% real: el negocio cobra al momento con Stripe, así que no hay diferencia entre devengado y efectivo que calcular aquí.
            </p>
            <PnlRow label="Entradas de efectivo" valor={ingresos} />
            <PnlRow label="Salidas de efectivo" valor={-totalGastos} />
            <PnlDiv />
            <PnlRow label="Flujo neto del período" valor={utilidad} fuerte />
          </div>
        </>
      )}

      {vista === "indicadores" && (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi etiqueta="TICKET PROMEDIO" valor={`$${currency.format(ticketPromedio)}`} nota="por compra" />
            <Kpi etiqueta="INGRESO POR PORCIÓN" valor={`$${currency.format(ingresoPorPorcion)}`} nota={`${entregadas} porciones entregadas`} />
            <Kpi
              etiqueta="CAC (marketing)"
              valor={cacReal != null ? `$${currency.format(Math.round(cacReal))}` : "—"}
              nota={
                cacReal != null
                  ? `$${currency.format(gastoMarketing)} entre ${nuevosClientesPeriodo} clientes nuevos`
                  : gastoMarketing > 0
                    ? `$${currency.format(gastoMarketing)} gastado, sin clientes nuevos en el período`
                    : "sin gastos de categoría Marketing"
              }
            />
            <Kpi etiqueta="LTV" valor={`$${currency.format(ltv)}`} nota={`ingreso histórico prom. / ${clientesConCompraTotal} clientes`} />
            <Kpi
              etiqueta="CHURN DEL PERÍODO"
              valor={churnPct != null ? `${churnPct}%` : "—"}
              nota={churnPct != null ? `${clientesDesactivadosPeriodo} de ${clientesBaseChurn} clientes se dieron de baja` : "sin clientes base para calcularlo"}
            />
            <Kpi
              etiqueta="PUNTO DE EQUILIBRIO"
              valor={breakEvenMxn != null ? `$${currency.format(breakEvenMxn)}` : "—"}
              nota={breakEvenPorciones != null ? `${breakEvenPorciones} porciones/período` : "margen de contribución no positivo"}
            />
            <Kpi
              etiqueta="CAPACIDAD DE PRODUCCIÓN"
              valor={capacidadDiaria != null ? `${utilizacionCapacidadPct}%` : "—"}
              nota={capacidadDiaria != null ? `${promedioPorcionesDiarias.toFixed(1)} de ${capacidadDiaria} porciones/día` : "configura la capacidad abajo"}
            />
          </div>
          <ConfiguracionForm isrActual={isrTasaPct} capacidadActual={capacidadDiaria} />

          <p className="text-[18px] font-medium text-cream">Clientes nuevos por canal (período)</p>
          <CanalesGrid canales={canalesOrdenados} />

          <p className="text-[11px] leading-[16px] text-muted/70">
            Supuestos: LTV usa el ingreso histórico total entre clientes con al menos una compra (no proyecta retención futura). Churn
            compara clientes dados de baja en el período contra los que ya existían al inicio del período (necesitas marcar clientes
            como inactivos en Clientes para que este número se mueva). Punto de equilibrio asume que todos los gastos registrados son
            fijos (no hay clasificación fijo/variable en `gastos`) y usa el margen de contribución promedio por crédito. El CAC divide
            el gasto total de categoría Marketing entre los clientes nuevos del período, sin distinguir por canal (no hay gasto
            registrado por canal, solo el conteo de clientes sí se desglosa abajo).
          </p>
        </>
      )}

      {vista === "balance" && (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi etiqueta="ACTIVOS" valor={`$${currency.format(Math.round(totalActivos))}`} nota="bancos + activos fijos netos" destacado />
            <Kpi etiqueta="PASIVOS" valor={`$${currency.format(Math.round(totalPasivos))}`} nota="cuentas por pagar + créditos pendientes" />
            <Kpi etiqueta="CAPITAL" valor={`$${currency.format(Math.round(totalCapital))}`} nota="aportaciones + utilidad acumulada" />
          </div>
          {Math.abs(diferenciaNoConciliada) > 1 && (
            <NoDisponible
              titulo="Diferencia no conciliada"
              detalle={`Activos − Pasivos − Capital = $${currency.format(Math.round(diferenciaNoConciliada))}. No se fuerza a cuadrar en $0 porque la utilidad acumulada es una aproximación (usa el costo actual de cada platillo para pedidos entregados en el pasado, no el costo real que tenía cada mes) y probablemente falten saldos de arranque (banco/capital inicial) por capturar abajo.`}
            />
          )}

          <p className="text-[18px] font-medium text-cream">Activos fijos</p>
          <TablaActivosFijos activos={activosFijos ?? []} hoy={hoy} />
          <ActivoFijoForm />

          <p className="text-[18px] font-medium text-cream">Cuentas bancarias</p>
          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[500px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Cuenta</th>
                  <th className="px-5 py-3.5 font-medium">Saldo</th>
                  <th className="px-5 py-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(cuentasBancarias ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-[14px] text-muted">
                      Sin cuentas capturadas.
                    </td>
                  </tr>
                ) : (
                  (cuentasBancarias ?? []).map((c) => <CuentaBancariaFila key={c.id} cuenta={c} />)
                )}
              </tbody>
            </table>
          </div>
          <CuentaBancariaForm />

          <p className="text-[18px] font-medium text-cream">Capital (aportaciones y retiros de socios)</p>
          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Fecha</th>
                  <th className="px-5 py-3.5 font-medium">Tipo</th>
                  <th className="px-5 py-3.5 font-medium">Monto</th>
                  <th className="px-5 py-3.5 font-medium">Nota</th>
                  <th className="px-5 py-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(capitalMovimientos ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-[14px] text-muted">
                      Sin movimientos de capital registrados.
                    </td>
                  </tr>
                ) : (
                  (capitalMovimientos ?? []).map((m) => (
                    <tr key={m.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                      <td className="px-5 py-3.5">{fechaCorta.format(new Date(`${m.fecha}T00:00:00`))}</td>
                      <td className="px-5 py-3.5 text-muted">{m.tipo === "retiro" ? "Retiro" : "Aportación"}</td>
                      <td className="px-5 py-3.5">${currency.format(m.monto_mxn)}</td>
                      <td className="px-5 py-3.5 text-muted">{m.nota ?? "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <MovimientoCapitalEliminarBoton movimientoId={m.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <MovimientoCapitalForm />
        </>
      )}

      {vista === "cxp" && (
        <>
          <Kpi
            etiqueta="TOTAL PENDIENTE"
            valor={`$${currency.format(totalCxP)}`}
            nota={`${(gastosPendientes ?? []).length} gastos sin pagar`}
            destacado
          />
          <p className="text-[18px] font-medium text-cream">Gastos pendientes de pago</p>
          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Descripción</th>
                  <th className="px-5 py-3.5 font-medium">Proveedor</th>
                  <th className="px-5 py-3.5 font-medium">Vence</th>
                  <th className="px-5 py-3.5 font-medium">Monto</th>
                  <th className="px-5 py-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(gastosPendientes ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-[14px] text-muted">
                      No hay gastos pendientes de pago.
                    </td>
                  </tr>
                ) : (
                  (gastosPendientes ?? []).map((g) => (
                    <tr key={g.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                      <td className="px-5 py-3.5">{g.descripcion}</td>
                      <td className="px-5 py-3.5 text-muted">{g.proveedor ?? "—"}</td>
                      <td className="px-5 py-3.5 text-muted">
                        {g.fecha_vencimiento ? fechaCorta.format(new Date(`${g.fecha_vencimiento}T00:00:00`)) : "—"}
                      </td>
                      <td className="px-5 py-3.5">${currency.format(g.monto_mxn)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <GastoPagadoBoton gastoId={g.id} pagado={false} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {vista === "gastos" && (
        <>
          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Fecha</th>
                  <th className="px-5 py-3.5 font-medium">Descripción</th>
                  <th className="px-5 py-3.5 font-medium">Categoría</th>
                  <th className="px-5 py-3.5 font-medium">Proveedor</th>
                  <th className="px-5 py-3.5 font-medium">Monto</th>
                  <th className="px-5 py-3.5 font-medium">Estado</th>
                  <th className="px-5 py-3.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {listaGastos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-[14px] text-muted">
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
                        <GastoPagadoBoton gastoId={g.id} pagado={g.pagado} />
                      </td>
                      <td className="px-5 py-3.5">
                        <GastoEliminarBoton gastoId={g.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[18px] font-medium text-cream">Registrar gasto</p>
          <GastoForm categorias={categorias ?? []} hoyISO={toISODate(hoy)} />

          <p className="text-[18px] font-medium text-cream">Cierre mensual</p>
          <div className="flex max-w-[560px] flex-col gap-3 rounded-card border border-line bg-surface p-6">
            <p className="text-[13px] text-muted">
              {mesContable?.cerrado
                ? `${anioActual}-${pad(mesActual)} cerrado${mesContable.cerrado_en ? ` el ${fechaCorta.format(new Date(mesContable.cerrado_en))}` : ""}.`
                : `${anioActual}-${pad(mesActual)} sigue abierto.`}
            </p>
            <CierreMesBoton anio={anioActual} mes={mesActual} cerrado={mesContable?.cerrado ?? false} />
          </div>
        </>
      )}

      {vista === "pasivo" && (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi etiqueta="CRÉDITOS SIN CONSUMIR" valor={String(saldoTotal)} nota={`${clientesConSaldo.length} clientes con saldo`} destacado />
            <Kpi etiqueta="VALOR ESTIMADO" valor={`$${currency.format(valorPasivoEstimado)}`} nota="créditos × precio pagado por cada cliente" />
            <Kpi etiqueta="INGRESOS DEL PERÍODO" valor={`$${currency.format(ingresos)}`} nota="ya cobrados en Stripe" />
          </div>
          <p className="text-[18px] font-medium text-cream">Clientes con créditos pendientes</p>
          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Cliente</th>
                  <th className="px-5 py-3.5 font-medium">Créditos</th>
                  <th className="px-5 py-3.5 font-medium">Precio ponderado/crédito</th>
                  <th className="px-5 py-3.5 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {clientesConSaldoDetalle.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-[14px] text-muted">
                      Ningún cliente tiene créditos pendientes.
                    </td>
                  </tr>
                ) : (
                  clientesConSaldoDetalle
                    .sort((a, b) => b.valor - a.valor)
                    .map((s) => (
                      <tr key={s.usuario_id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                        <td className="px-5 py-3">{(s.usuarios as unknown as { nombre: string } | null)?.nombre ?? "—"}</td>
                        <td className="px-5 py-3">{s.saldo}</td>
                        <td className="px-5 py-3 text-muted">${s.precioPonderado.toFixed(0)}</td>
                        <td className="px-5 py-3">${currency.format(s.valor)}</td>
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

function CanalesGrid({ canales }: { canales: [string, number][] }) {
  if (canales.length === 0) return <p className="text-[13px] text-muted">Sin clientes nuevos en este período.</p>;
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {canales.map(([canal, cantidad]) => (
        <div key={canal} className="flex flex-col gap-1.5 rounded-card border border-line bg-surface px-5 py-4">
          <p className="text-[10px] font-medium tracking-[0.8px] text-gold">{canal.toUpperCase()}</p>
          <p className="font-display text-[22px] font-semibold text-cream">
            {cantidad} {cantidad === 1 ? "cliente" : "clientes"}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Gráfica de barras agrupadas (ingresos vs. gastos por mes) — CSS
 * puro, sin librería, mismo criterio que `EstadisticaBarras`/
 * `EstadisticaDona` en admin/Clientes. Vertical (no horizontal como
 * las de Clientes) porque el eje natural de un flujo de caja es el
 * tiempo, no una categoría.
 */
function FlujoBarras({ filas }: { filas: { etiqueta: string; ingresos: number; gastos: number }[] }) {
  const ALTO = 160;
  const max = Math.max(1, ...filas.flatMap((f) => [f.ingresos, f.gastos]));
  const sinDatos = filas.every((f) => f.ingresos === 0 && f.gastos === 0);

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-cream">Entradas vs. salidas por mes</p>
        <div className="flex items-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-[8px] rounded-full bg-success" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-[8px] rounded-full bg-danger" /> Gastos
          </span>
        </div>
      </div>
      {sinDatos ? (
        <p className="text-[13px] text-muted">Sin movimientos en este período.</p>
      ) : (
        <div className="flex items-end gap-5 overflow-x-auto pb-1">
          {filas.map((f) => {
            const altoIngresos = Math.max(f.ingresos > 0 ? 3 : 0, Math.round((f.ingresos / max) * ALTO));
            const altoGastos = Math.max(f.gastos > 0 ? 3 : 0, Math.round((f.gastos / max) * ALTO));
            return (
              <div key={f.etiqueta} className="flex shrink-0 flex-col items-center gap-2">
                <div className="flex items-end gap-1.5" style={{ height: ALTO }}>
                  <div
                    className="w-[18px] rounded-t-sm bg-success"
                    style={{ height: altoIngresos }}
                    title={`Ingresos ${f.etiqueta}: $${currency.format(f.ingresos)}`}
                  />
                  <div
                    className="w-[18px] rounded-t-sm bg-danger"
                    style={{ height: altoGastos }}
                    title={`Gastos ${f.etiqueta}: $${currency.format(f.gastos)}`}
                  />
                </div>
                <p className="whitespace-nowrap text-[11px] text-muted">{f.etiqueta}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Mismos tokens que EstadisticaDona (admin/Clientes) — categoría → %
// del total, aquí en pesos en vez de conteo. Composición de un total
// (paquete/categoría) sigue siendo el caso de uso correcto para dona,
// no barras (no hay progresión/orden entre categorías).
const PALETA_FINANZAS = ["#C9A15C", "#7FB069", "#D9A441", "#C0654F", "#9A8E7A", "#E2D5BD"];

function DonaFinanzas({
  titulo,
  filas,
  vacio = "Sin datos en este período.",
}: {
  titulo: string;
  filas: { etiqueta: string; valor: number }[];
  vacio?: string;
}) {
  const total = filas.reduce((acc, f) => acc + f.valor, 0);
  let acumulado = 0;
  const segmentos = filas.map((f, i) => {
    const inicio = total > 0 ? (acumulado / total) * 100 : 0;
    acumulado += f.valor;
    const fin = total > 0 ? (acumulado / total) * 100 : 0;
    return { ...f, color: PALETA_FINANZAS[i % PALETA_FINANZAS.length], inicio, fin };
  });
  const gradiente = total > 0 ? `conic-gradient(${segmentos.map((s) => `${s.color} ${s.inicio}% ${s.fin}%`).join(", ")})` : "#33291F";

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface px-6 py-5">
      <p className="text-[13px] font-medium text-cream">{titulo}</p>
      {total === 0 ? (
        <p className="text-[13px] text-muted">{vacio}</p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative size-[120px] shrink-0 rounded-full" style={{ background: gradiente }}>
            <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-surface">
              <p className="font-display text-[14px] font-semibold text-cream">${currency.format(total)}</p>
              <p className="text-[10px] text-muted">total</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {segmentos.map((s) => {
              const pct = Math.round((s.valor / total) * 100);
              return (
                <div key={s.etiqueta} className="flex items-center justify-between gap-3 text-[12px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-[8px] shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <p className="truncate text-cream">{s.etiqueta}</p>
                  </div>
                  <p className="shrink-0 text-muted">
                    ${currency.format(s.valor)} · {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
      <p className="text-[13px] font-medium text-muted">{titulo}</p>
      <p className="text-[12px] leading-[18px] text-muted/80">{detalle}</p>
    </div>
  );
}

function TablaActivosFijos({
  activos,
  hoy,
}: {
  activos: { id: string; nombre: string; valor_compra_mxn: number; fecha_compra: string; vida_util_meses: number; activo: boolean }[];
  hoy: Date;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
            <th className="px-5 py-3.5 font-medium">Nombre</th>
            <th className="px-5 py-3.5 font-medium">Valor de compra</th>
            <th className="px-5 py-3.5 font-medium">Depreciación acumulada</th>
            <th className="px-5 py-3.5 font-medium">Valor neto</th>
            <th className="px-5 py-3.5 font-medium">Estado</th>
            <th className="px-5 py-3.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {activos.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-[14px] text-muted">
                Sin activos fijos capturados.
              </td>
            </tr>
          ) : (
            activos.map((a) => {
              const fechaCompra = new Date(`${a.fecha_compra}T00:00:00`);
              const mensual = a.valor_compra_mxn / a.vida_util_meses;
              const mesesDeprec = Math.min(mesesTranscurridos(fechaCompra, hoy), a.vida_util_meses);
              const depreciacionAcumulada = mensual * mesesDeprec;
              const valorNeto = Math.max(0, a.valor_compra_mxn - depreciacionAcumulada);
              return (
                <tr key={a.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                  <td className="px-5 py-3.5 font-medium">{a.nombre}</td>
                  <td className="px-5 py-3.5">${currency.format(a.valor_compra_mxn)}</td>
                  <td className="px-5 py-3.5 text-muted">${currency.format(Math.round(depreciacionAcumulada))}</td>
                  <td className="px-5 py-3.5">${currency.format(Math.round(valorNeto))}</td>
                  <td className="px-5 py-3.5">
                    <span className={`pill border ${a.activo ? "border-success text-success" : "border-line text-muted"}`}>
                      {a.activo ? "Activo" : "Baja"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ActivoFijoActivoBoton activoId={a.id} activo={a.activo} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
