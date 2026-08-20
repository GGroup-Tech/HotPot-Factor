import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { puedeEditarPedido } from "@/lib/creditos";
import { ImprimirButton } from "@/app/components/admin/ImprimirButton";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return toISODate(d);
}

type UnidadesSinDecimales = "pieza" | "piezas";

/**
 * A2 — Admin · Producción. Figma node 253:2.
 *
 * Dos pestañas, no dos pantallas: "Por día" (el mock original —
 * porciones y zonas de UN día) y "Lista de compras" (backlog #56 —
 * ingredientes sumados sobre un RANGO de días). Se pensaron primero
 * como páginas separadas ("Compras" en el sidebar), pero el usuario
 * hizo notar 2026-08-20 que ambas responden la misma pregunta
 * ("qué necesito para las entregas") en dos horizontes de tiempo
 * distintos — producción es el día de hoy, compras es la semana que
 * viene — así que viven mejor juntas que como dos entradas más en un
 * sidebar que ya tiene 10 secciones. Se controla con `?vista=dia`
 * (default) / `?vista=compras`, cada una con su propio estado de
 * fechas en la URL (`fecha` para el día; `inicio`/`fin` para el rango).
 *
 * El mock incluye "Costo estimado" ($/porción) y ventanas de entrega
 * por zona ("Entregar entre 12:00 y 2:00 pm"). Ninguno de los dos
 * existe en el esquema real: `platillos` no tiene columna de costo, y
 * no hay ningún concepto de ventana horaria de reparto en `pedidos`
 * ni en `zonas_cobertura`. En vez de inventar esos números, la
 * pestaña "Por día" solo muestra lo que sí es real.
 */
export default async function AdminProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string; inicio?: string; fin?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const vista = params.vista === "compras" ? "compras" : "dia";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-fit gap-1 rounded-pill border border-line bg-surface p-1">
        <a
          href="/admin/produccion"
          className={`rounded-pill px-4 py-2 text-[13px] transition-colors ${
            vista === "dia" ? "bg-raised font-medium text-cream" : "text-muted hover:text-cream"
          }`}
        >
          Por día
        </a>
        <a
          href="/admin/produccion?vista=compras"
          className={`rounded-pill px-4 py-2 text-[13px] transition-colors ${
            vista === "compras" ? "bg-raised font-medium text-cream" : "text-muted hover:text-cream"
          }`}
        >
          Lista de compras
        </a>
      </div>

      {vista === "compras" ? <VistaCompras params={params} /> : <VistaPorDia params={params} />}
    </div>
  );
}

async function VistaPorDia({ params }: { params: { fecha?: string } }) {
  const admin = createAdminClient();
  const { fecha: fechaParam } = params;

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
    // `es_comodin` es `boolean | null` en el esquema real — se
    // normaliza a `false` cuando viene nulo.
    const actual = porPlatillo.get(platillo.id) ?? { nombre: platillo.nombre, esComodin: p.es_comodin ?? false, cantidad: 0 };
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
    <>
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
    </>
  );
}

/**
 * Pestaña "Lista de compras" (backlog #56) — suma los ingredientes que
 * hacen falta para TODOS los pedidos no cancelados de un rango de
 * fechas. Ver nota de cálculo completa en el mensaje de entrega
 * original: `platillo_ingredientes.cantidad` es por LOTE
 * (`platillos.rendimiento_porciones` porciones), así que cada pedido
 * aporta `cantidad_del_lote / rendimiento_porciones` antes de sumar,
 * agrupando por producto+unidad para que un mismo ingrediente
 * compartido entre muchas recetas (sal, ajo, aceite...) se junte en
 * una sola fila con el total real a comprar.
 */
async function VistaCompras({ params }: { params: { inicio?: string; fin?: string } }) {
  const admin = createAdminClient();
  const { inicio: inicioParam, fin: finParam } = params;

  const hoy = toISODate(new Date());
  const inicio = inicioParam || hoy;
  const fin = finParam || sumarDias(inicio, 6);

  const { data: pedidosRaw } = await admin
    .from("pedidos")
    .select("id, platillo_id, platillos(id, nombre, rendimiento_porciones)")
    .gte("fecha_entrega", inicio)
    .lte("fecha_entrega", fin)
    .neq("estado", "cancelado");

  const pedidos = pedidosRaw ?? [];

  const pedidosPorPlatillo = new Map<string, { nombre: string; rendimiento: number; cantidad: number }>();
  for (const p of pedidos) {
    const platillo = p.platillos as unknown as { id: string; nombre: string; rendimiento_porciones: number } | null;
    if (!platillo || !p.platillo_id) continue;
    const actual = pedidosPorPlatillo.get(p.platillo_id) ?? {
      nombre: platillo.nombre,
      rendimiento: platillo.rendimiento_porciones || 10,
      cantidad: 0,
    };
    actual.cantidad += 1;
    pedidosPorPlatillo.set(p.platillo_id, actual);
  }

  const platilloIds = [...pedidosPorPlatillo.keys()];
  const { data: ingredientesRaw } =
    platilloIds.length > 0
      ? await admin.from("platillo_ingredientes").select("platillo_id, producto, unidad, cantidad").in("platillo_id", platilloIds)
      : { data: [] as { platillo_id: string; producto: string; unidad: string | null; cantidad: number | null }[] };

  const agregado = new Map<string, { producto: string; unidad: string; cantidad: number }>();
  const platillosConIngredientes = new Set<string>();
  for (const fila of ingredientesRaw ?? []) {
    const info = pedidosPorPlatillo.get(fila.platillo_id);
    if (!info) continue;
    // `cantidad`/`unidad` son NOT NULL en la base real, pero el tipo
    // generado los marca nullable a propósito (mismo patrón defensivo
    // que el resto del proyecto) — se descarta cualquier fila
    // incompleta en vez de tronar el build.
    if (fila.cantidad == null || !fila.unidad) continue;
    platillosConIngredientes.add(fila.platillo_id);
    const cantidadPorPedido = fila.cantidad / info.rendimiento;
    const cantidadTotal = cantidadPorPedido * info.cantidad;
    const clave = `${fila.producto.trim().toLowerCase()}__${fila.unidad.trim().toLowerCase()}`;
    const actual = agregado.get(clave) ?? { producto: fila.producto.trim(), unidad: fila.unidad.trim(), cantidad: 0 };
    actual.cantidad += cantidadTotal;
    agregado.set(clave, actual);
  }

  const listaCompras = [...agregado.values()].sort((a, b) => a.producto.localeCompare(b.producto));
  const platillosSinIngredientes = [...pedidosPorPlatillo.entries()]
    .filter(([id]) => !platillosConIngredientes.has(id))
    .map(([, info]) => info);

  const UNIDADES_SIN_DECIMALES: UnidadesSinDecimales[] = ["pieza", "piezas"];
  function formatearCantidad(cantidad: number, unidad: string): string {
    if (UNIDADES_SIN_DECIMALES.includes(unidad.toLowerCase() as UnidadesSinDecimales)) {
      return String(Math.ceil(cantidad));
    }
    return String(Math.ceil(cantidad * 100) / 100);
  }

  const platillosOrdenados = [...pedidosPorPlatillo.values()].sort((a, b) => b.cantidad - a.cantidad);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2.5 rounded-pill border border-line bg-surface px-4 py-2">
          <input type="hidden" name="vista" value="compras" />
          <label className="flex items-center gap-2 text-[13px] text-muted">
            Del
            <input
              type="date"
              name="inicio"
              defaultValue={inicio}
              className="rounded-control border border-line bg-ink px-2 py-1 text-[13px] text-cream"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            al
            <input
              type="date"
              name="fin"
              defaultValue={fin}
              className="rounded-control border border-line bg-ink px-2 py-1 text-[13px] text-cream"
            />
          </label>
          <button type="submit" className="btn-secondary rounded-control px-3.5 py-1.5 text-[12px]">
            Ver
          </button>
        </form>
        <div className="flex items-center gap-2.5">
          <a
            href={`/admin/produccion?vista=compras&inicio=${hoy}&fin=${sumarDias(hoy, 6)}`}
            className="text-[12px] text-muted hover:text-cream"
          >
            Próximos 7 días
          </a>
          <ImprimirButton className="btn-secondary rounded-control px-[18px] py-[11px] text-[13px]">
            Imprimir lista
          </ImprimirButton>
        </div>
      </div>

      <p className="text-[13px] text-muted">
        {fechaCorta.format(new Date(`${inicio}T00:00:00`))} – {fechaCorta.format(new Date(`${fin}T00:00:00`))} ·{" "}
        {pedidos.length} {pedidos.length === 1 ? "entrega programada" : "entregas programadas"} (sin cancelados)
      </p>

      <p className="text-[18px] font-medium text-cream">Lista de compras</p>
      <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[500px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
              <th className="px-5 py-3.5 font-medium">Producto</th>
              <th className="px-5 py-3.5 font-medium">Cantidad</th>
              <th className="px-5 py-3.5 font-medium">Unidad</th>
            </tr>
          </thead>
          <tbody>
            {listaCompras.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-[14px] text-muted">
                  No hay ingredientes que calcular para este rango — revisa que haya entregas programadas y que
                  los platillos tengan ingredientes cargados.
                </td>
              </tr>
            ) : (
              listaCompras.map((item) => (
                <tr key={`${item.producto}__${item.unidad}`} className="border-b border-line text-[13px] text-cream last:border-b-0">
                  <td className="px-5 py-3">{item.producto}</td>
                  <td className="px-5 py-3 font-medium text-gold">{formatearCantidad(item.cantidad, item.unidad)}</td>
                  <td className="px-5 py-3 text-muted">{item.unidad}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {platillosSinIngredientes.length > 0 && (
        <div className="rounded-card-sm border border-warning px-4 py-3">
          <p className="text-[13px] text-cream">
            {platillosSinIngredientes.length === 1
              ? "Este platillo tiene pedidos en el rango pero no tiene ingredientes cargados todavía, así que no está en la lista de arriba:"
              : "Estos platillos tienen pedidos en el rango pero no tienen ingredientes cargados todavía, así que no están en la lista de arriba:"}
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {platillosSinIngredientes.map((p) => `${p.nombre} (${p.cantidad})`).join(" · ")}
          </p>
        </div>
      )}

      <p className="text-[18px] font-medium text-cream">Pedidos por platillo en el rango</p>
      <div className="flex w-full flex-col gap-2.5">
        {platillosOrdenados.length === 0 ? (
          <p className="rounded-card border border-line bg-surface px-6 py-8 text-center text-[14px] text-muted">
            No hay pedidos programados en este rango de fechas.
          </p>
        ) : (
          platillosOrdenados.map((p) => (
            <div key={p.nombre} className="flex w-full items-center justify-between gap-6 rounded-card border border-line bg-surface px-5 py-3.5">
              <p className="text-[14px] text-cream">{p.nombre}</p>
              <p className="text-[14px] font-medium text-gold">{p.cantidad}</p>
            </div>
          ))
        )}
      </div>
    </>
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
