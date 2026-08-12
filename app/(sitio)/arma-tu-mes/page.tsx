import Link from "next/link";
import { FlowNav } from "@/app/components/sitio/FlowNav";
import { Stepper } from "@/app/components/sitio/Stepper";
import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { puedeEditarPedido, comodinesDisponibles as calcComodinesDisponibles } from "@/lib/creditos";
import { Calendario } from "./Calendario";
import type { DiaCeldaData } from "./DiaCelda";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 04 — Arma tu mes. Figma node 108:2. */
export default async function ArmaTuMesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const { user } = await requireUsuario();
  const supabase = await createClient();

  const hoy = new Date();
  let anio = hoy.getFullYear();
  let mesNum = hoy.getMonth() + 1;
  if (mesParam) {
    const [anioParam, mesParamNum] = mesParam.split("-").map(Number);
    if (anioParam) anio = anioParam;
    if (mesParamNum) mesNum = mesParamNum;
  }
  const primerDia = new Date(anio, mesNum - 1, 1);
  const ultimoDia = new Date(anio, mesNum, 0);
  const mesISO = `${anio}-${pad(mesNum)}-01`;

  const mesAnterior = new Date(anio, mesNum - 2, 1);
  const mesSiguiente = new Date(anio, mesNum, 1);

  const [{ data: menuFijo }, { data: comodinPlatillos }, { data: pedidos }, { data: comodinRow }, { data: saldoRow }] =
    await Promise.all([
      supabase
        .from("menu_mes")
        .select("dia_semana, platillos(id, nombre)")
        .eq("mes", mesISO)
        .eq("publicado", true),
      supabase.from("platillos").select("id, nombre").eq("disponible_comodin", true).eq("activo", true),
      supabase
        .from("pedidos")
        .select("id, fecha_entrega, platillo_id, es_comodin, estado, platillos(id, nombre)")
        .eq("usuario_id", user.id)
        .gte("fecha_entrega", toISODate(primerDia))
        .lte("fecha_entrega", toISODate(ultimoDia))
        .neq("estado", "cancelado"),
      supabase
        .from("comodines_mes")
        .select("usados")
        .eq("usuario_id", user.id)
        .eq("mes", mesISO)
        .maybeSingle(),
      supabase.from("saldo_creditos").select("saldo").eq("usuario_id", user.id).maybeSingle(),
    ]);

  const menuPorDia = new Map<number, { id: string; nombre: string }>();
  for (const fila of menuFijo ?? []) {
    const p = fila.platillos as unknown as { id: string; nombre: string } | null;
    if (p && fila.dia_semana) menuPorDia.set(fila.dia_semana, p);
  }

  const pedidosPorFecha = new Map<string, DiaCeldaData["pedido"]>();
  for (const p of pedidos ?? []) {
    const platillo = p.platillos as unknown as { id: string; nombre: string } | null;
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
  // Alinea el cursor al lunes de la primera semana visible.
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

  return (
    <div className="flex min-h-screen flex-col">
      <FlowNav />
      <Stepper activo={4} />
      <main className="flex flex-col items-start gap-[30px] px-6 md:px-10 lg:px-[100px] pb-10 pt-[52px]">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-[10px]">
            <h1 className="text-display-m text-cream">Arma tu mes</h1>
            <p className="w-full max-w-[620px] text-[16px] leading-[26px] text-muted">
              Mueve, cambia o cancela cualquier entrega cuando quieras. Solo se bloquean las que salen en
              las próximas 48 horas.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-pill border border-line bg-surface px-[18px] py-[11px]">
            <Link
              href={`/arma-tu-mes?mes=${mesAnterior.getFullYear()}-${pad(mesAnterior.getMonth() + 1)}`}
              className="text-[18px] text-muted hover:text-cream"
            >
              ‹
            </Link>
            <p className="text-[16px] font-medium text-cream">
              {MESES[mesNum - 1]} {anio}
            </p>
            <Link
              href={`/arma-tu-mes?mes=${mesSiguiente.getFullYear()}-${pad(mesSiguiente.getMonth() + 1)}`}
              className="text-[18px] text-gold hover:text-gold/80"
            >
              ›
            </Link>
          </div>
        </div>

        <div className="flex w-full flex-col gap-[14px] rounded-card border border-line bg-surface px-6 py-[22px]">
          <p className="text-eyebrow text-gold">MENÚ FIJO DE {(MESES[mesNum - 1] ?? "").toUpperCase()}</p>
          <div className="flex w-full flex-wrap gap-3">
            {["LUN", "MAR", "MIÉ", "JUE", "VIE"].map((h, i) => {
              const p = menuPorDia.get(i + 1);
              return (
                <div key={h} className="flex min-w-[100px] flex-1 flex-col gap-1.5 rounded-control border border-line bg-ink px-3.5 py-3">
                  <p className="text-[10px] font-medium tracking-[0.8px] text-muted">{h}</p>
                  <p className="text-[14px] leading-5 text-cream">{p?.nombre ?? "Por definir"}</p>
                </div>
              );
            })}
          </div>
          {comodinPlatillos && comodinPlatillos.length > 0 && (
            <>
              <div className="h-px w-full bg-line" />
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[14px] text-muted">
                  Comodines — puedes usarlos en lugar del platillo fijo de cualquier día:
                </p>
                {comodinPlatillos.map((p) => (
                  <span key={p.id} className="pill text-[13px]">
                    {p.nombre}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <Calendario
          semanas={semanas}
          comodinesDisponibles={disponibles}
          platillosComodin={comodinPlatillos ?? []}
        />
      </main>

      <div className="flex w-full flex-col gap-4 border-t border-line bg-surface px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-10 lg:px-[100px]">
        <div className="flex flex-col gap-2">
          <p className="text-[18px] font-medium text-cream">
            {asignadosEsteMes} de {totalCreditos} créditos asignados&nbsp;&nbsp;·&nbsp;&nbsp;{saldo} sin usar
          </p>
          <div className="h-[6px] w-full max-w-[300px] overflow-hidden rounded-pill bg-line">
            <div
              className="h-[6px] rounded-pill bg-gold"
              style={{ width: totalCreditos > 0 ? `${(asignadosEsteMes / totalCreditos) * 100}%` : "0%" }}
            />
          </div>
        </div>
        <Link href="/confirmacion" className="btn-primary rounded-control px-[34px] py-4 text-[16px]">
          Guardar cambios
        </Link>
      </div>
    </div>
  );
}
