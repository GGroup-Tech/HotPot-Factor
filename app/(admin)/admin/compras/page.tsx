import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { ImprimirButton } from "@/app/components/admin/ImprimirButton";

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
 * AF — Admin · Compras (backlog #56, 2026-08-20). Suma los
 * ingredientes que hacen falta para TODOS los pedidos no cancelados
 * de un rango de fechas, para que compras sepa cuánto surtir antes de
 * la semana de producción.
 *
 * Cómo se calcula: `platillo_ingredientes.cantidad` es POR LOTE
 * (`platillos.rendimiento_porciones` porciones), no por porción
 * individual — así viene el recetario del chef. Para cada pedido real
 * de un platillo: cantidad_por_pedido = cantidad_del_lote /
 * rendimiento_porciones. Se suma esa cantidad_por_pedido por cada
 * pedido, agrupando por producto+unidad para que "Sal fina · kg" de
 * distintos platillos se sume en una sola fila.
 *
 * Si un platillo no tiene filas en `platillo_ingredientes` (p.ej. uno
 * dado de alta a mano desde el panel, sin ingredientes cargados), sus
 * pedidos simplemente no aportan nada a la lista — se avisa aparte
 * cuáles platillos quedaron así, para que compras sepa que la lista
 * está incompleta en esos casos y no se confíe ciegamente.
 */
export default async function AdminComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fin?: string }>;
}) {
  await requireStaff();
  const admin = createAdminClient();
  const { inicio: inicioParam, fin: finParam } = await searchParams;

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

  // Cuántos pedidos hay de cada platillo en el rango.
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
      : { data: [] as { platillo_id: string; producto: string; unidad: string; cantidad: number }[] };

  // Agrega por producto+unidad (normalizado en minúsculas para no
  // duplicar filas por "Sal fina" vs "sal fina" entre recetas).
  const agregado = new Map<string, { producto: string; unidad: string; cantidad: number }>();
  const platillosConIngredientes = new Set<string>();
  for (const fila of ingredientesRaw ?? []) {
    const info = pedidosPorPlatillo.get(fila.platillo_id);
    if (!info) continue;
    // `cantidad`/`unidad` son NOT NULL en la base real (ver
    // `migracion-platillo-ingredientes.sql`), pero el tipo generado en
    // types/database.ts los marca nullable a propósito (mismo patrón
    // defensivo que el resto del proyecto) — se descarta cualquier fila
    // que de todos modos venga incompleta en vez de tronar el build.
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
    // Redondea hacia arriba a 2 decimales — mejor comprar de más que
    // de menos por un redondeo hacia abajo.
    return String(Math.ceil(cantidad * 100) / 100);
  }

  const platillosOrdenados = [...pedidosPorPlatillo.values()].sort((a, b) => b.cantidad - a.cantidad);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2.5 rounded-pill border border-line bg-surface px-4 py-2">
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
            href={`/admin/compras?inicio=${hoy}&fin=${sumarDias(hoy, 6)}`}
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
    </div>
  );
}
