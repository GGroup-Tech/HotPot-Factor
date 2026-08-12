import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import type { MovimientoTipo } from "@/types/database";

const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

const TIPO_LABEL: Record<MovimientoTipo, string> = {
  compra: "Compra de paquete",
  asignacion: "Asignación a entrega",
  consumo: "Entrega consumida",
  cancelacion: "Cancelación — crédito devuelto",
  ajuste_manual: "Ajuste manual",
  comodin: "Comodín",
};

/** 08 — Mis créditos. Saldo siempre derivado de credito_movimientos (SUM), nunca cacheado. */
export default async function CreditosPage() {
  const { user } = await requireUsuario();
  const supabase = await createClient();

  const [{ data: saldoRow }, { data: movimientos }] = await Promise.all([
    supabase.from("saldo_creditos").select("saldo").eq("usuario_id", user.id).maybeSingle(),
    supabase
      .from("credito_movimientos")
      .select("id, cantidad, tipo, nota, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const saldo = saldoRow?.saldo ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-gold">MIS CRÉDITOS</p>
        <h1 className="text-display-m text-cream">{saldo} créditos disponibles</h1>
        <p className="text-[14px] text-muted">Tus créditos no vencen. Se descuentan al asignar una entrega.</p>
      </div>

      <div className="flex flex-col rounded-card-lg border border-line bg-surface">
        <div className="hidden gap-4 border-b border-line px-6 py-3 text-[12px] font-medium uppercase tracking-[0.6px] text-muted sm:grid sm:grid-cols-[1fr_auto_auto]">
          <p>Movimiento</p>
          <p>Fecha</p>
          <p className="text-right">Créditos</p>
        </div>
        {(movimientos ?? []).length === 0 ? (
          <p className="px-6 py-8 text-center text-[14px] text-muted">Todavía no tienes movimientos.</p>
        ) : (
          (movimientos ?? []).map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-1 border-b border-line px-6 py-4 last:border-b-0 sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4"
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] text-cream">{TIPO_LABEL[m.tipo]}</p>
                {m.nota && <p className="text-[12px] text-muted">{m.nota}</p>}
              </div>
              <p className="text-[13px] text-muted">{fecha.format(new Date(m.created_at))}</p>
              <p
                className={`text-right text-[14px] font-medium num ${
                  m.cantidad > 0 ? "text-success" : "text-cream"
                }`}
              >
                {m.cantidad > 0 ? "+" : ""}
                {m.cantidad}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
