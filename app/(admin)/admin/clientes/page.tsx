import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClienteActivoBoton } from "./ClienteActivoBoton";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** null si no hay fecha de nacimiento capturada. */
function calcularEdad(fechaNac: string | null): number | null {
  if (!fechaNac) return null;
  const nacimiento = new Date(`${fechaNac}T00:00:00`);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const noHaCumplidoAnos =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (noHaCumplidoAnos) edad--;
  return edad;
}

/**
 * A1 — Admin · Clientes. Figma node 115:2 (incluye ya la vista
 * "Lista" con sus KPIs — la pestaña "Estadísticas", 304:7, muestra
 * los mismos KPIs sin la tabla, así que se reutiliza el mismo cálculo
 * en vez de duplicar consultas).
 *
 * `createAdminClient()` — mismo motivo que Pedidos y A0: `requireStaff()`
 * ya verificó identidad, así que las lecturas no dependen de RLS para
 * staff (que nunca se configuró).
 *
 * Corregido 2026-08-17/18: `usuarios` no tiene `email` (vive en
 * auth.users, se trae con `admin.auth.admin.listUsers()`) ni
 * `created_at` (es `creado_en`) — con los nombres viejos la consulta
 * completa fallaba en silencio, por eso el panel siempre mostraba "0
 * clientes activos" sin importar cuántos hubiera. Se agrega
 * `fecha_nac` → columna "Edad".
 */
export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string; vista?: string }>;
}) {
  await requireStaff();
  const admin = createAdminClient();
  const { q, filtro = "todos", vista = "lista" } = await searchParams;

  const hoy = new Date();
  const hoyISO = toISODate(hoy);
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [
    { data: usuarios },
    { data: saldos },
    { data: compras },
    { data: pedidos },
    { data: paquetesActivos },
    { data: authUsers },
  ] = await Promise.all([
    admin.from("usuarios").select("id, nombre, telefono, fecha_nac, colonia, activo, creado_en"),
    admin.from("saldo_creditos").select("usuario_id, saldo"),
    admin
      .from("compras")
      .select("usuario_id, monto_mxn, created_at, paquetes(nombre)")
      .order("created_at", { ascending: false }),
    admin
      .from("pedidos")
      .select("usuario_id, fecha_entrega, estado")
      .neq("estado", "cancelado")
      .gte("fecha_entrega", toISODate(primerDiaMes)),
    admin.from("paquetes").select("precio_mxn, creditos").eq("activo", true),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailPorId = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? "—"]));

  const saldoPorUsuario = new Map((saldos ?? []).map((s) => [s.usuario_id, s.saldo]));
  const comprasPorUsuario = new Map<string, { monto_mxn: number; created_at: string; paquete: string | null }[]>();
  for (const c of compras ?? []) {
    const lista = comprasPorUsuario.get(c.usuario_id) ?? [];
    lista.push({ monto_mxn: c.monto_mxn, created_at: c.created_at, paquete: (c.paquetes as unknown as { nombre: string } | null)?.nombre ?? null });
    comprasPorUsuario.set(c.usuario_id, lista);
  }
  const pedidosPorUsuario = new Map<string, { fecha_entrega: string; estado: string }[]>();
  for (const p of pedidos ?? []) {
    const lista = pedidosPorUsuario.get(p.usuario_id) ?? [];
    lista.push({ fecha_entrega: p.fecha_entrega, estado: p.estado });
    pedidosPorUsuario.set(p.usuario_id, lista);
  }

  const clientesActivos = (usuarios ?? []).filter((u) => u.activo);
  const nuevosSemana = clientesActivos.filter((u) => u.creado_en && toISODate(new Date(u.creado_en)) >= toISODate(inicioSemana)).length;
  const nuevosMes = clientesActivos.filter((u) => u.creado_en && new Date(u.creado_en) >= primerDiaMes).length;
  const totalCreditosDisponibles = (saldos ?? []).reduce((acc, s) => acc + s.saldo, 0);
  const creditosTotalesPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.creditos, 0);
  const precioTotalPaq = (paquetesActivos ?? []).reduce((acc, p) => acc + p.precio_mxn, 0);
  const precioPromedioPorCredito = creditosTotalesPaq > 0 ? precioTotalPaq / creditosTotalesPaq : 0;
  const pasivoEstimado = Math.round(totalCreditosDisponibles * precioPromedioPorCredito);
  const todasLasCompras = compras ?? [];
  const ticketPromedio = todasLasCompras.length > 0 ? Math.round(todasLasCompras.reduce((a, c) => a + c.monto_mxn, 0) / todasLasCompras.length) : 0;
  const pedidosHoyCount = (pedidos ?? []).filter((p) => p.fecha_entrega === hoyISO).length;
  const zonasActivas = new Set(clientesActivos.map((u) => u.colonia?.trim()).filter(Boolean)).size;
  const sinCreditos = clientesActivos.filter((u) => (saldoPorUsuario.get(u.id) ?? 0) === 0).length;
  const saldoAlto = clientesActivos.filter((u) => (saldoPorUsuario.get(u.id) ?? 0) > 10).length;
  const conMasDeUnaCompra = [...comprasPorUsuario.values()].filter((c) => c.length > 1).length;
  const conAlMenosUnaCompra = comprasPorUsuario.size;
  const recompraPct = conAlMenosUnaCompra > 0 ? Math.round((conMasDeUnaCompra / conAlMenosUnaCompra) * 100) : 0;
  const platillosEntregadosMes = (pedidos ?? []).filter((p) => p.estado === "entregado").length;

  // La tabla usa TODOS los clientes (no solo `clientesActivos`) para
  // que al marcar a alguien como inactivo no desaparezca de la lista
  // sin forma de reactivarlo — los KPIs de arriba sí siguen usando
  // solo `clientesActivos` a propósito, son métricas de la base activa.
  let filas = (usuarios ?? []).map((u) => {
    const saldo = saldoPorUsuario.get(u.id) ?? 0;
    const comprasUsuario = comprasPorUsuario.get(u.id) ?? [];
    const paqueteReciente = comprasUsuario[0]?.paquete ?? "—";
    const proxEntrega = (pedidosPorUsuario.get(u.id) ?? [])
      .filter((p) => p.fecha_entrega >= hoyISO)
      .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega))[0];
    return {
      ...u,
      email: emailPorId.get(u.id) ?? "—",
      edad: calcularEdad(u.fecha_nac),
      saldo,
      paqueteReciente,
      proxEntrega: proxEntrega?.fecha_entrega ?? null,
    };
  });

  if (filtro === "con_creditos") filas = filas.filter((f) => f.saldo > 0);
  if (filtro === "sin_creditos") filas = filas.filter((f) => f.saldo === 0);
  const busqueda = q?.trim().toLowerCase();
  if (busqueda) {
    filas = filas.filter(
      (f) =>
        f.nombre.toLowerCase().includes(busqueda) ||
        f.email.toLowerCase().includes(busqueda) ||
        (f.telefono ?? "").toLowerCase().includes(busqueda),
    );
  }

  const qs = (params: Record<string, string>) => {
    const merged = { q: q ?? "", filtro, vista, ...params };
    const usp = new URLSearchParams(Object.entries(merged).filter(([, v]) => v));
    return `/admin/clientes?${usp.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">
        {clientesActivos.length} activos · {nuevosMes} nuevos este mes
      </p>

      <div className="flex items-start gap-1">
        <a
          href={qs({ vista: "lista" })}
          className={`rounded-control px-[18px] py-[10px] text-[14px] font-medium ${
            vista === "lista" ? "border border-gold bg-raised text-gold" : "text-muted hover:text-cream"
          }`}
        >
          Lista
        </a>
        <a
          href={qs({ vista: "estadisticas" })}
          className={`rounded-control px-[18px] py-[10px] text-[14px] font-medium ${
            vista === "estadisticas" ? "border border-gold bg-raised text-gold" : "text-muted hover:text-cream"
          }`}
        >
          Estadísticas
        </a>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi etiqueta="CLIENTES ACTIVOS" valor={String(clientesActivos.length)} nota={`+${nuevosSemana} esta semana`} destacado />
        <Kpi etiqueta="CRÉDITOS DISPONIBLES" valor={String(totalCreditosDisponibles)} nota={`Pasivo estimado: $${currency.format(pasivoEstimado)} MXN`} color="text-warning" />
        <Kpi etiqueta="TICKET PROMEDIO" valor={`$${currency.format(ticketPromedio)}`} nota="por compra de paquete" />
        <Kpi etiqueta="ENTREGAS HOY" valor={String(pedidosHoyCount)} nota={`en ${zonasActivas} ${zonasActivas === 1 ? "zona" : "zonas"}`} />
      </div>

      <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-6">
        <KpiChica etiqueta="NUEVOS ESTE MES" valor={String(nuevosMes)} nota="compraron por 1a vez" color="text-success" />
        <KpiChica etiqueta="SIN CRÉDITOS" valor={String(sinCreditos)} nota="pueden necesitar recordatorio" color="text-warning" />
        <KpiChica etiqueta="SALDO ALTO +10" valor={String(saldoAlto)} nota="revisar si siguen activos" color="text-warning" />
        <KpiChica etiqueta="RECOMPRA" valor={`${recompraPct}%`} nota="compraron 2+ veces" color="text-cream" />
        <KpiChica etiqueta="PLATILLOS ENTREGADOS" valor={String(platillosEntregadosMes)} nota="acumulado este mes" color="text-cream" />
        <KpiChica etiqueta="ZONAS ACTIVAS" valor={String(zonasActivas)} nota="colonias con clientes" color="text-cream" />
      </div>

      {vista === "lista" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <form method="get" className="min-w-[220px] flex-1">
              <input type="hidden" name="filtro" value={filtro} />
              <input type="hidden" name="vista" value={vista} />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Buscar por nombre, correo o teléfono…"
                className="w-full rounded-control border border-line bg-surface px-4 py-[11px] text-[14px] text-cream placeholder:text-muted focus:border-gold/60 focus:outline-none"
              />
            </form>
            <a href={qs({ filtro: "todos" })} className={`rounded-control border px-4 py-[11px] text-[13px] font-medium ${filtro === "todos" ? "border-gold bg-raised text-gold" : "border-line text-muted"}`}>
              Todos
            </a>
            <a href={qs({ filtro: "con_creditos" })} className={`rounded-control border px-4 py-[11px] text-[13px] font-medium ${filtro === "con_creditos" ? "border-gold bg-raised text-gold" : "border-line text-muted"}`}>
              Con créditos
            </a>
            <a href={qs({ filtro: "sin_creditos" })} className={`rounded-control border px-4 py-[11px] text-[13px] font-medium ${filtro === "sin_creditos" ? "border-gold bg-raised text-gold" : "border-line text-muted"}`}>
              Sin créditos
            </a>
          </div>

          <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
                  <th className="px-5 py-3.5 font-medium">Cliente</th>
                  <th className="px-5 py-3.5 font-medium">Contacto</th>
                  <th className="px-5 py-3.5 font-medium">Edad</th>
                  <th className="px-5 py-3.5 font-medium">Paquete</th>
                  <th className="px-5 py-3.5 font-medium">Créditos</th>
                  <th className="px-5 py-3.5 font-medium">Próx. entrega</th>
                  <th className="px-5 py-3.5 font-medium">Estado créditos</th>
                  <th className="px-5 py-3.5 font-medium">Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-[14px] text-muted">
                      No hay clientes que coincidan.
                    </td>
                  </tr>
                ) : (
                  filas.map((f) => (
                    <tr key={f.id} className="border-b border-line text-[13px] last:border-b-0">
                      <td className="px-5 py-3.5 font-medium text-cream">{f.nombre}</td>
                      <td className="px-5 py-3.5 text-muted">{f.email}</td>
                      <td className="px-5 py-3.5 text-muted">{f.edad ?? "—"}</td>
                      <td className="px-5 py-3.5 text-muted">{f.paqueteReciente}</td>
                      <td className="px-5 py-3.5 text-muted">{f.saldo}</td>
                      <td className="px-5 py-3.5 text-muted">
                        {f.proxEntrega ? fechaCorta.format(new Date(`${f.proxEntrega}T00:00:00`)) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`pill border ${f.saldo > 0 ? "border-success text-success" : "border-warning text-warning"}`}>
                          {f.saldo > 0 ? "Con saldo" : "Sin créditos"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <ClienteActivoBoton usuarioId={f.id} activo={f.activo ?? false} />
                      </td>
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

function Kpi({ etiqueta, valor, nota, destacado, color }: { etiqueta: string; valor: string; nota: string; destacado?: boolean; color?: string }) {
  return (
    <div className={`flex flex-col gap-2 rounded-card border px-5 py-5 ${destacado ? "border-[1.5px] border-gold bg-raised" : "border-line bg-surface"}`}>
      <p className="text-[9px] font-medium tracking-[0.9px] text-gold">{etiqueta}</p>
      <p className={`font-display text-[28px] font-semibold ${color ?? "text-cream"}`}>{valor}</p>
      <p className="text-[12px] text-muted">{nota}</p>
    </div>
  );
}

function KpiChica({ etiqueta, valor, nota, color }: { etiqueta: string; valor: string; nota: string; color: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card-sm border border-line bg-surface px-4 py-4">
      <p className="text-[9px] font-medium tracking-[0.9px] text-gold">{etiqueta}</p>
      <p className={`font-display text-[20px] font-semibold ${color}`}>{valor}</p>
      <p className="text-[11px] text-muted">{nota}</p>
    </div>
  );
}
