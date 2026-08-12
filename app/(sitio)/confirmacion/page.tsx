import Link from "next/link";
import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { LOGO_CREAM_SRC } from "@/lib/brand/logo";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

/** 05 — Confirmación. Figma node 109:2. */
export default async function ConfirmacionPage() {
  const { user } = await requireUsuario();
  const supabase = await createClient();

  const hoy = new Date();
  const primerDia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: compra }, { data: pedidos }, { data: saldoRow }] = await Promise.all([
    supabase
      .from("compras")
      .select("monto_mxn, paquetes(nombre, creditos)")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pedidos")
      .select("fecha_entrega")
      .eq("usuario_id", user.id)
      .neq("estado", "cancelado")
      .gte("fecha_entrega", primerDia)
      .order("fecha_entrega", { ascending: true }),
    supabase.from("saldo_creditos").select("saldo").eq("usuario_id", user.id).maybeSingle(),
  ]);

  const paquete = compra?.paquetes as unknown as { nombre: string; creditos: number } | null;
  const primeraEntrega = pedidos?.[0]?.fecha_entrega;
  const nombreMes = new Intl.DateTimeFormat("es-MX", { month: "long" }).format(hoy);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-[100px] py-6">
        <Link href="/" aria-label="HotPot Factor" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_CREAM_SRC} alt="HotPot Factor" className="h-[48px] w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="pill">
            <span className="num text-[14px]">{saldoRow?.saldo ?? 0} créditos disponibles</span>
          </div>
          <div className="size-[34px] rounded-full bg-raised" />
        </div>
      </div>
      <div className="h-px w-full bg-line" />

      <main className="flex flex-col items-center gap-[26px] px-[100px] pb-[130px] pt-[110px]">
        <div className="flex size-[72px] items-center justify-center rounded-full bg-gold">
          <span className="text-[34px] font-bold text-ink">✓</span>
        </div>
        <h1 className="text-center text-display-l text-cream">Tu mes está listo</h1>
        <p className="w-[520px] text-center text-[17px] leading-7 text-muted">
          Te mandamos el detalle a tu correo. Recibirás un recordatorio 48 horas antes de cada entrega.
        </p>

        <div className="flex w-[560px] flex-col rounded-card-lg border border-line bg-surface px-8">
          <Fila label="Paquete" valor={paquete ? `${paquete.nombre} — ${paquete.creditos} créditos` : "—"} />
          <Fila label="Pagado" valor={compra ? `$${currency.format(compra.monto_mxn)} MXN` : "—"} />
          <Fila label="Entregas programadas" valor={`${pedidos?.length ?? 0} en ${nombreMes}`} />
          <Fila label="Créditos disponibles" valor={String(saldoRow?.saldo ?? 0)} />
          <Fila
            label="Primera entrega"
            valor={primeraEntrega ? fechaLarga.format(new Date(`${primeraEntrega}T00:00:00`)) : "Por asignar"}
            dorado
            sinBorde
          />
        </div>

        <div className="flex items-start gap-[14px] pt-2">
          <Link href="/cuenta/entregas" className="btn-primary rounded-control px-8 py-4 text-[16px]">
            Ver mis entregas
          </Link>
          <Link href="/" className="btn-secondary rounded-control px-8 py-4 text-[16px]">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}

function Fila({
  label,
  valor,
  dorado,
  sinBorde,
}: {
  label: string;
  valor: string;
  dorado?: boolean;
  sinBorde?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 text-[15px] ${sinBorde ? "" : "border-b border-line"}`}>
      <p className="text-muted">{label}</p>
      <p className={dorado ? "font-medium text-gold" : "font-medium text-cream"}>{valor}</p>
    </div>
  );
}
