import Link from "next/link";
import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { comodinesDisponibles as calcComodinesDisponibles } from "@/lib/creditos";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 06 — Resumen / Mi cuenta. */
export default async function CuentaPage() {
  const { user, usuario } = await requireUsuario();
  const supabase = await createClient();

  const hoy = new Date();
  const primerDiaMes = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-01`;
  const mesISO = primerDiaMes;

  const [{ data: saldoRow }, { data: proximoPedido }, { count: pedidosMesCount }, { data: comodinRow }] =
    await Promise.all([
      supabase.from("saldo_creditos").select("saldo").eq("usuario_id", user.id).maybeSingle(),
      supabase
        .from("pedidos")
        .select("fecha_entrega, platillos(nombre)")
        .eq("usuario_id", user.id)
        .neq("estado", "cancelado")
        .gte("fecha_entrega", toISODate(hoy))
        .order("fecha_entrega", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", user.id)
        .neq("estado", "cancelado")
        .gte("fecha_entrega", primerDiaMes),
      supabase.from("comodines_mes").select("usados").eq("usuario_id", user.id).eq("mes", mesISO).maybeSingle(),
    ]);

  const platilloProximo = proximoPedido?.platillos as unknown as { nombre: string } | null;
  const saldo = saldoRow?.saldo ?? 0;
  const disponiblesComodin = calcComodinesDisponibles(comodinRow?.usados ?? 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-gold">MI CUENTA</p>
        <h1 className="text-display-m text-cream">Hola, {usuario.nombre.split(" ")[0]}</h1>
      </div>

      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <TarjetaResumen
          etiqueta="Créditos disponibles"
          valor={String(saldo)}
          nota="Nunca vencen"
          href="/cuenta/creditos"
        />
        <TarjetaResumen
          etiqueta="Próxima entrega"
          valor={
            proximoPedido
              ? fechaLarga.format(new Date(`${proximoPedido.fecha_entrega}T00:00:00`))
              : "Sin programar"
          }
          nota={platilloProximo?.nombre ?? "Elige tu menú en Mi calendario"}
          href="/cuenta/entregas"
        />
        <TarjetaResumen
          etiqueta="Comodines este mes"
          valor={`${disponiblesComodin} de 2`}
          nota="Se renuevan cada mes"
          href="/arma-tu-mes"
        />
      </div>

      <div className="flex flex-col gap-4 rounded-card-lg border border-line bg-surface p-7">
        <p className="text-[18px] font-medium text-cream">Accesos rápidos</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/arma-tu-mes" className="btn-primary rounded-control px-6 py-[13px] text-[15px]">
            Armar mi mes
          </Link>
          <Link href="/cuenta/entregas" className="btn-secondary rounded-control px-6 py-[13px] text-[15px]">
            Ver mis entregas
          </Link>
          <Link href="/cuenta/compras" className="btn-secondary rounded-control px-6 py-[13px] text-[15px]">
            Historial de compras
          </Link>
        </div>
      </div>

      <p className="text-[13px] text-muted">
        {pedidosMesCount ?? 0} entregas programadas este mes · {usuario.colonia ?? "Agrega tu colonia en Mi perfil"}
      </p>
    </div>
  );
}

function TarjetaResumen({
  etiqueta,
  valor,
  nota,
  href,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-card-lg border border-line bg-surface p-6 transition-colors hover:border-gold/50"
    >
      <p className="text-eyebrow text-gold">{etiqueta.toUpperCase()}</p>
      <p className="font-display text-[30px] font-semibold text-cream">{valor}</p>
      <p className="text-[13px] text-muted">{nota}</p>
    </Link>
  );
}
