import Link from "next/link";
import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });

/**
 * 09 — Mis compras.
 *
 * Corregido 2026-08-19 (auditoría de Finanzas): `compras` no tiene
 * columna `created_at` — el nombre real es `creado_en` (confirmado
 * vía information_schema). Con el tipo viejo esto compilaba pero
 * fallaba en producción porque PostgREST rechaza un `.select()` que
 * pida una columna inexistente.
 */
export default async function ComprasPage() {
  const { user } = await requireUsuario();
  const supabase = await createClient();

  const { data: compras } = await supabase
    .from("compras")
    .select("id, monto_mxn, creado_en, paquetes(nombre, creditos)")
    .eq("usuario_id", user.id)
    .order("creado_en", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-gold">MIS COMPRAS</p>
        <h1 className="text-display-m text-cream">Historial de compras</h1>
      </div>

      {(compras ?? []).length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card-lg border border-line bg-surface p-7">
          <p className="text-[15px] text-muted">Todavía no has comprado ningún paquete.</p>
          <Link href="/paquetes" className="btn-primary rounded-control px-6 py-[13px] text-[15px]">
            Ver paquetes
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(compras ?? []).map((c) => {
            const paquete = c.paquetes as unknown as { nombre: string; creditos: number } | null;
            return (
              <div
                key={c.id}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-[15px] font-medium text-cream">{paquete?.nombre ?? "Paquete"}</p>
                  <p className="text-[13px] text-muted">
                    {c.creado_en ? fecha.format(new Date(c.creado_en)) : "—"}
                    {paquete && ` · ${paquete.creditos} créditos`}
                  </p>
                </div>
                <p className="font-display text-[20px] font-semibold text-gold">
                  ${currency.format(c.monto_mxn)} MXN
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
