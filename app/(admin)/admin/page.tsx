import Link from "next/link";
import { requireStaff } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { fechaPublicacionMenu, menuEstaPublicado } from "@/lib/creditos";
import { ImprimirButton } from "@/app/components/admin/ImprimirButton";
import { publicarMenu } from "../actions";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A0 — Panel (dashboard admin). Figma node 183:2.
 *
 * NOTA IMPORTANTE sobre datos que el diseño de Figma asume pero que
 * el esquema actual no modela: el mock de A0 trae una tarjeta
 * "Clientes" con segmentación "Con suscripción / Un solo mes" y una
 * alerta "Cobro fallido". Ese vocabulario asume cobros recurrentes
 * automáticos (suscripciones), pero el negocio implementado en las
 * Fases 0-2 es de compras de paquete puntuales (créditos que no
 * vencen, un PaymentIntent por compra) — no existe ningún concepto de
 * "suscripción" ni de reintentos de cobro fallido en la base de datos
 * ni en el webhook de Stripe (`app/api/stripe/webhook/route.ts` solo
 * registra pagos exitosos). Esta página SOLO usa cifras reales:
 * la tarjeta de clientes se adaptó a "activos / nuevos esta semana /
 * con créditos disponibles", y la alerta de "cobro fallido" se omitió
 * en vez de inventar un número. Si quieres cobros recurrentes de
 * verdad, es trabajo nuevo (tabla de suscripciones + webhook de
 * `payment_intent.payment_failed`), no algo que ya exista y falte
 * conectar.
 */
export default async function AdminPanelPage() {
  await requireStaff();
  const supabase = await createClient();

  const hoy = new Date();
  const hoyISO = toISODate(hoy);
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // lunes de esta semana
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const primerDiaMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const primerDiaMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const mesActualISO = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-01`;

  const [
    { data: pedidosHoyRaw },
    { count: clientesActivos },
    { count: clientesNuevosSemana },
    { data: comprasMes },
    { data: comprasMesPasado },
    { data: saldos },
    { count: clientesConCreditos },
    { data: paquetesActivos },
    { data: menuMesRaw },
  ] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, estado, es_comodin, usuarios(nombre, colonia), platillos(id, nombre)")
      .eq("fecha_entrega", hoyISO)
      .neq("estado", "cancelado"),
    supabase.from("usuarios").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("activo", true)
      .gte("created_at", toISODate(inicioSemana)),
    supabase
      .from("compras")
      .select("monto_mxn")
      .gte("created_at", primerDiaMes.toISOString())
      .lt("created_at", primerDiaMesSiguiente.toISOString()),
    supabase
      .from("compras")
      .select("monto_mxn")
      .gte("created_at", primerDiaMesPasado.toISOString())
      .lt("created_at", primerDiaMes.toISOString()),
    supabase.from("saldo_creditos").select("saldo"),
    supabase.from("saldo_creditos").select("usuario_id", { count: "exact", head: true }).gt("saldo", 0),
    supabase.from("paquetes").select("precio_mxn, creditos").eq("activo", true),
    supabase.from("menu_mes").select("dia_semana, publicado, platillos(id, nombre)").eq("mes", mesActualISO),
  ]);

  // --- Entregas hoy + zonas ---
  const pedidosHoy = pedidosHoyRaw ?? [];
  const zonaConteo = new Map<string, number>();
  for (const p of pedidosHoy) {
    const usuario = p.usuarios as unknown as { nombre: string; colonia: string | null } | null;
    const zona = usuario?.colonia?.trim();
    if (zona) zonaConteo.set(zona, (zonaConteo.get(zona) ?? 0) + 1);
  }
  const zonasTop = [...zonaConteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([z]) => z);

  // --- Ingresos ---
  const ingresosMes = (comprasMes ?? []).reduce((acc, c) => acc + c.monto_mxn, 0);
  const ingresosMesPasado = (comprasMesPasado ?? []).reduce((acc, c) => acc + c.monto_mxn, 0);

  // --- Créditos pasivo (estimado) ---
  const totalCreditosPendientes = (saldos ?? []).reduce((acc, s) => acc + s.saldo, 0);
  const creditosTotalesPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.creditos, 0);
  const precioTotalPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.precio_mxn, 0);
  const precioPromedioPorCredito = creditosTotalesPaq > 0 ? precioTotalPaq / creditosTotalesPaq : 0;
  const valorPasivoEstimado = Math.round(totalCreditosPendientes * precioPromedioPorCredito);

  // --- Menú del mes ---
  const menuPorDia = new Map<number, string>();
  let publicado = false;
  for (const fila of menuMesRaw ?? []) {
    if (fila.publicado) publicado = true;
    const p = fila.platillos as unknown as { nombre: string } | null;
    if (p && fila.dia_semana) menuPorDia.set(fila.dia_semana, p.nombre);
  }
  const menuConfigurado = (menuMesRaw ?? []).length > 0;
  const nombreMesActual = MESES[hoy.getMonth()] ?? "";
  const nombreMesCapitalizado = nombreMesActual.charAt(0).toUpperCase() + nombreMesActual.slice(1);

  // --- Producción hoy (agrupado por platillo) ---
  const produccionMap = new Map<string, { nombre: string; esComodin: boolean; cantidad: number }>();
  for (const p of pedidosHoy) {
    const platillo = p.platillos as unknown as { id: string; nombre: string } | null;
    if (!platillo) continue;
    const actual = produccionMap.get(platillo.id) ?? { nombre: platillo.nombre, esComodin: p.es_comodin, cantidad: 0 };
    actual.cantidad += 1;
    produccionMap.set(platillo.id, actual);
  }
  const produccionTop = [...produccionMap.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 3);

  // --- Alertas (solo señales reales — ver nota arriba sobre cobro fallido) ---
  const alertas: { titulo: string; detalle: string; tono: "gold" | "warning" | "success" }[] = [];
  if (!menuEstaPublicado(publicado)) {
    const fechaLimite = fechaPublicacionMenu(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));
    alertas.push({
      titulo: "Menú pendiente",
      detalle: menuConfigurado
        ? `${nombreMesCapitalizado} configurado pero sin publicar`
        : `${nombreMesCapitalizado} sin configurar — se publica antes del ${fechaLimite.getDate()}`,
      tono: "warning",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {!menuEstaPublicado(publicado) && (
        <div className="flex flex-col items-start gap-3 rounded-card border border-warning bg-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[11px]">
            <span className="size-[7px] shrink-0 rounded-full bg-warning" />
            <p className="text-[14px] text-cream">
              Hoy salen {pedidosHoy.length} entregas. El menú de {nombreMesActual} aún no está publicado.
            </p>
          </div>
          {menuConfigurado && (
            <form
              action={async () => {
                "use server";
                await publicarMenu(mesActualISO);
              }}
            >
              <button type="submit" className="btn-primary rounded-control px-[18px] py-[10px] text-[13px]">
                Publicar
              </button>
            </form>
          )}
        </div>
      )}

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat etiqueta="ENTREGAS HOY" valor={String(pedidosHoy.length)} nota={zonasTop.length > 0 ? `en ${zonasTop.join(" y ")}` : "sin entregas hoy"} destacado />
        <Stat etiqueta="CLIENTES ACTIVOS" valor={String(clientesActivos ?? 0)} nota={`+${clientesNuevosSemana ?? 0} esta semana`} />
        <Stat
          etiqueta={`INGRESOS ${nombreMesActual.slice(0, 3).toUpperCase()}`}
          valor={`$${currency.format(ingresosMes)}`}
          nota={`vs $${currency.format(ingresosMesPasado)} el mes pasado`}
        />
        <Stat
          etiqueta="CRÉDITOS PASIVO"
          valor={`$${currency.format(valorPasivoEstimado)}`}
          nota={`${totalCreditosPendientes} créditos sin consumir`}
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <p className="text-[18px] font-medium text-cream">Pedidos de hoy</p>
          <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
            <div className="hidden gap-4 border-b border-line px-5 py-3 text-[10px] font-medium uppercase tracking-[1px] text-gold sm:grid sm:grid-cols-[1fr_200px_140px]">
              <p>Cliente</p>
              <p>Platillo</p>
              <p>Zona</p>
            </div>
            {pedidosHoy.length === 0 ? (
              <p className="px-5 py-8 text-center text-[14px] text-muted">No hay entregas programadas para hoy.</p>
            ) : (
              pedidosHoy.slice(0, 8).map((p) => {
                const usuario = p.usuarios as unknown as { nombre: string; colonia: string | null } | null;
                const platillo = p.platillos as unknown as { nombre: string } | null;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-1 border-b border-line px-5 py-3.5 text-[13px] text-cream last:border-b-0 sm:grid sm:grid-cols-[1fr_200px_140px] sm:items-center sm:gap-4"
                  >
                    <p>{usuario?.nombre ?? "—"}</p>
                    <p>{platillo?.nombre ?? "—"}</p>
                    <p className="text-muted">{usuario?.colonia ?? "—"}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[18px] font-medium text-cream">Alertas</p>
          {alertas.length === 0 ? (
            <div className="rounded-card border border-line bg-surface px-[18px] py-4">
              <p className="text-[13px] text-muted">Sin alertas por ahora.</p>
            </div>
          ) : (
            alertas.map((a) => (
              <div
                key={a.titulo}
                className={`flex flex-col gap-[5px] rounded-card-sm border px-[18px] py-4 ${
                  a.tono === "warning" ? "border-warning" : a.tono === "success" ? "border-success" : "border-gold"
                }`}
              >
                <div className="flex items-center gap-[10px]">
                  <span
                    className={`size-[7px] rounded-full ${
                      a.tono === "warning" ? "bg-warning" : a.tono === "success" ? "bg-success" : "bg-gold"
                    }`}
                  />
                  <p className="text-[14px] font-medium text-cream">{a.titulo}</p>
                </div>
                <p className="text-[12px] text-muted">{a.detalle}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-eyebrow text-gold">ACCESO RÁPIDO</p>
      <div className="grid w-full grid-cols-1 gap-[18px] lg:grid-cols-3">
        <Link
          href="/admin/clientes"
          className="flex flex-col gap-4 rounded-card border border-line bg-surface px-6 py-[22px] transition-colors hover:border-gold/50"
        >
          <div className="flex w-full items-center justify-between">
            <p className="text-eyebrow text-gold">CLIENTES</p>
            <p className="text-[12px] text-muted">Ver todos →</p>
          </div>
          <p className="font-display text-[36px] font-semibold text-cream">{clientesActivos ?? 0}</p>
          <p className="text-[12px] text-muted">activos</p>
          <div className="h-px w-full bg-line" />
          <Fila label="Nuevos esta semana" valor={String(clientesNuevosSemana ?? 0)} color="text-success" />
          <Fila label="Con créditos disponibles" valor={String(clientesConCreditos ?? 0)} color="text-cream" />
        </Link>

        <div className="flex flex-col gap-4 rounded-card border-[1.5px] border-gold bg-raised px-6 py-[22px]">
          <div className="flex w-full items-center justify-between">
            <p className="text-eyebrow text-gold">MENÚ DEL MES</p>
            <span
              className={`rounded-pill border px-[10px] py-[5px] text-[11px] font-medium ${
                publicado ? "border-success text-success" : "border-warning text-warning"
              }`}
            >
              {nombreMesCapitalizado} {publicado ? "publicado" : "sin publicar"}
            </span>
          </div>
          <p className="font-display text-[22px] font-semibold text-cream">
            {nombreMesCapitalizado} {hoy.getFullYear()}
          </p>
          <div className="h-px w-full bg-line" />
          {DIAS.map((d, i) => (
            <div key={d} className="flex w-full items-center justify-between text-[12px]">
              <p className="font-medium text-gold">{d}</p>
              <p className="text-cream">{menuPorDia.get(i + 1) ?? "Por definir"}</p>
            </div>
          ))}
          {!publicado && menuConfigurado && (
            <form
              action={async () => {
                "use server";
                await publicarMenu(mesActualISO);
              }}
              className="w-full"
            >
              <button type="submit" className="btn-primary w-full rounded-control py-3 text-[13px]">
                Publicar menú de {nombreMesActual}
              </button>
            </form>
          )}
          {!menuConfigurado && (
            <Link href="/admin/menu" className="btn-secondary w-full rounded-control py-3 text-center text-[13px]">
              Configurar menú
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface px-6 py-[22px]">
          <div className="flex w-full items-center justify-between">
            <p className="text-eyebrow text-gold">PRODUCCIÓN HOY</p>
            <Link href="/admin/produccion" className="text-[12px] text-muted hover:text-cream">
              Ver detalle →
            </Link>
          </div>
          <p className="font-display text-[36px] font-semibold text-cream">{pedidosHoy.length}</p>
          <p className="text-[12px] text-muted">porciones a producir hoy</p>
          <div className="h-px w-full bg-line" />
          {produccionTop.length === 0 ? (
            <p className="text-[13px] text-muted">Sin pedidos hoy.</p>
          ) : (
            produccionTop.map((p) => (
              <div key={p.nombre} className="flex w-full items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-[13px] text-cream">{p.nombre}</p>
                  <p className="text-[10px] text-muted">{p.esComodin ? "Comodín" : "Platillo fijo"}</p>
                </div>
                <p className="font-display text-[18px] font-semibold text-gold">{p.cantidad}</p>
              </div>
            ))
          )}
          <ImprimirButton className="btn-secondary w-full rounded-control py-3 text-[13px]">
            Imprimir lista de cocina
          </ImprimirButton>
        </div>
      </div>
    </div>
  );
}

function Stat({
  etiqueta,
  valor,
  nota,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-[7px] rounded-card border px-5 py-[18px] ${
        destacado ? "border-[1.5px] border-gold bg-raised" : "border-line bg-surface"
      }`}
    >
      <p className="text-[9px] font-medium tracking-[0.9px] text-gold">{etiqueta}</p>
      <p className="font-display text-[26px] font-semibold text-cream">{valor}</p>
      <p className="text-[12px] text-muted">{nota}</p>
    </div>
  );
}

function Fila({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="flex w-full items-center justify-between text-[13px]">
      <p className="text-muted">{label}</p>
      <p className={`font-medium ${color}`}>{valor}</p>
    </div>
  );
}
