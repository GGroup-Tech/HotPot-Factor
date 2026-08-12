import { comodinesDisponibles as calcComodinesDisponibles, puedeEditarPedido } from "@/lib/creditos";
import type { createClient } from "@/lib/supabase/server";

/**
 * Lógica de "Arma tu mes" compartida entre el flujo de compra
 * (`/arma-tu-mes`, con FlowNav + Stepper) y el panel de cliente
 * (`/cuenta/calendario`, sin chrome de compra). Antes vivía toda esta
 * data-fetching + construcción de semanas duplicada dentro de
 * `app/(sitio)/arma-tu-mes/page.tsx` — moverla aquí es lo que permite
 * que ambas rutas sean vistas independientes del MISMO dato, en vez
 * de que el panel reutilice literalmente la pantalla de compra (ver
 * nota en `lib/cobertura.ts` sobre por qué la lógica duplicada es
 * peligrosa).
 */

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export const DIAS_SEMANA = ["LUN", "MAR", "MIÉ", "JUE", "VIE"] as const;

export interface PlatilloRef {
  id: string;
  nombre: string;
}

export interface DiaCeldaData {
  fecha: string; // 'YYYY-MM-DD'
  numero: number;
  editable: boolean; // false si está dentro de las 48h de corte
  platilloFijo: PlatilloRef | null;
  pedido: {
    id: string;
    platilloId: string;
    platilloNombre: string;
    esComodin: boolean;
  } | null;
}

export interface MesRef {
  anio: number;
  mesNum: number;
}

export interface CalendarioMes {
  anio: number;
  mesNum: number;
  mesISO: string;
  mesAnterior: MesRef;
  mesSiguiente: MesRef;
  menuPorDia: Map<number, PlatilloRef>;
  /** true si al menos un día del mes ya tiene `menu_mes.publicado = true`. */
  menuPublicado: boolean;
  /** fecha en que se publica el menú de este mes (día 20 del mes anterior). */
  fechaPublicacion: Date;
  comodinPlatillos: PlatilloRef[];
  semanas: (DiaCeldaData | null)[][];
  comodinesDisponibles: number;
  saldo: number;
  asignadosEsteMes: number;
  totalCreditos: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Resuelve año/mes desde el query param `?mes=YYYY-M`, o usa el mes actual. */
export function resolverMes(mesParam?: string): MesRef {
  const hoy = new Date();
  let anio = hoy.getFullYear();
  let mesNum = hoy.getMonth() + 1;
  if (mesParam) {
    const [anioParam, mesParamNum] = mesParam.split("-").map(Number);
    if (anioParam) anio = anioParam;
    if (mesParamNum) mesNum = mesParamNum;
  }
  return { anio, mesNum };
}

/** El menú del mes N se publica el día 20 del mes N-1. */
function fechaPublicacionMenu(anio: number, mesNum: number): Date {
  return new Date(anio, mesNum - 2, 20);
}

/**
 * Trae y arma todo lo necesario para pintar el calendario de un mes
 * para un usuario: menú fijo, comodines disponibles, pedidos ya
 * asignados, saldo y las semanas lun-vie ya construidas (con `null`
 * de relleno en los huecos). Usado tanto por `/arma-tu-mes` como por
 * `/cuenta/calendario`.
 */
export async function obtenerCalendarioMes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  anio: number,
  mesNum: number,
): Promise<CalendarioMes> {
  const primerDia = new Date(anio, mesNum - 1, 1);
  const ultimoDia = new Date(anio, mesNum, 0);
  const mesISO = `${anio}-${pad(mesNum)}-01`;
  const mesAnteriorDate = new Date(anio, mesNum - 2, 1);
  const mesSiguienteDate = new Date(anio, mesNum, 1);

  const [{ data: menuFijo }, { data: comodinPlatillos }, { data: pedidos }, { data: comodinRow }, { data: saldoRow }] =
    await Promise.all([
      // Sin filtro `publicado` aquí: lo necesitamos para poder distinguir
      // "no hay menú configurado todavía" de "sí hay pero no aplica a
      // este día", y mostrar el mensaje correcto en vez de celdas vacías
      // sin explicación.
      supabase
        .from("menu_mes")
        .select("dia_semana, publicado, platillos(id, nombre)")
        .eq("mes", mesISO),
      supabase.from("platillos").select("id, nombre").eq("disponible_comodin", true).eq("activo", true),
      supabase
        .from("pedidos")
        .select("id, fecha_entrega, platillo_id, es_comodin, estado, platillos(id, nombre)")
        .eq("usuario_id", userId)
        .gte("fecha_entrega", toISODate(primerDia))
        .lte("fecha_entrega", toISODate(ultimoDia))
        .neq("estado", "cancelado"),
      supabase
        .from("comodines_mes")
        .select("usados")
        .eq("usuario_id", userId)
        .eq("mes", mesISO)
        .maybeSingle(),
      supabase.from("saldo_creditos").select("saldo").eq("usuario_id", userId).maybeSingle(),
    ]);

  const menuPorDia = new Map<number, PlatilloRef>();
  let menuPublicado = false;
  for (const fila of menuFijo ?? []) {
    if (fila.publicado) menuPublicado = true;
    const p = fila.platillos as unknown as PlatilloRef | null;
    if (p && fila.dia_semana && fila.publicado) menuPorDia.set(fila.dia_semana, p);
  }

  const pedidosPorFecha = new Map<string, DiaCeldaData["pedido"]>();
  for (const p of pedidos ?? []) {
    const platillo = p.platillos as unknown as PlatilloRef | null;
    pedidosPorFecha.set(p.fecha_entrega, {
      id: p.id,
      platilloId: p.platillo_id ?? "",
      platilloNombre: platillo?.nombre ?? "—",
      esComodin: p.es_comodin,
    });
  }

  // Semanas lun-vie del mes, con `null` de relleno en los huecos.
  const semanas: (DiaCeldaData | null)[][] = [];
  let semanaActual: (DiaCeldaData | null)[] = [];
  const cursor = new Date(primerDia);
  const offsetInicio = (cursor.getDay() + 6) % 7; // 0=lunes
  for (let i = 0; i < offsetInicio && offsetInicio < 5; i++) semanaActual.push(null);

  while (cursor <= ultimoDia) {
    const diaSemanaISO = (cursor.getDay() + 6) % 7; // 0=lunes .. 6=domingo
    if (diaSemanaISO < 5) {
      const fechaISO = toISODate(cursor);
      const diaSemana1a5 = diaSemanaISO + 1;
      const platilloFijo = menuPorDia.get(diaSemana1a5) ?? null;
      const pedido = pedidosPorFecha.get(fechaISO) ?? null;
      semanaActual.push({
        fecha: fechaISO,
        numero: cursor.getDate(),
        editable: puedeEditarPedido(new Date(cursor)),
        platilloFijo,
        pedido,
      });
      if (semanaActual.length === 5) {
        semanas.push(semanaActual);
        semanaActual = [];
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (semanaActual.length > 0) {
    while (semanaActual.length < 5) semanaActual.push(null);
    semanas.push(semanaActual);
  }

  const comodinesUsados = comodinRow?.usados ?? 0;
  const disponibles = calcComodinesDisponibles(comodinesUsados);
  const saldo = saldoRow?.saldo ?? 0;
  const asignadosEsteMes = pedidos?.length ?? 0;
  const totalCreditos = saldo + asignadosEsteMes;

  return {
    anio,
    mesNum,
    mesISO,
    mesAnterior: { anio: mesAnteriorDate.getFullYear(), mesNum: mesAnteriorDate.getMonth() + 1 },
    mesSiguiente: { anio: mesSiguienteDate.getFullYear(), mesNum: mesSiguienteDate.getMonth() + 1 },
    menuPorDia,
    menuPublicado,
    fechaPublicacion: fechaPublicacionMenu(anio, mesNum),
    comodinPlatillos: comodinPlatillos ?? [],
    semanas,
    comodinesDisponibles: disponibles,
    saldo,
    asignadosEsteMes,
    totalCreditos,
  };
}
