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
  const ultimoDiaMes = toISODate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));

  const [{ data: saldoRow }, { data: proximoPedido }, { count: pedidosMesCount }, { count: comodinesUsadosCount }, { count: comprasCount }] =
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
      // Igual que en lib/calendario.ts: comodines_mes es config (qué
      // platillos son comodín este anio/mes), no un contador de uso —
      // cuántos ya usó este usuario se deriva contando sus pedidos.
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", user.id)
        .eq("es_comodin", true)
        .neq("estado", "cancelado")
        .gte("fecha_entrega", primerDiaMes)
        .lte("fecha_entrega", ultimoDiaMes),
      supabase.from("compras").select("id", { count: "exact", head: true }).eq("usuario_id", user.id),
    ]);

  const platilloProximo = proximoPedido?.platillos as unknown as { nombre: string } | null;
  const saldo = saldoRow?.saldo ?? 0;
  const disponiblesComodin = calcComodinesDisponibles(comodinesUsadosCount ?? 0);
  // Un usuario sin compras todavía es un caso distinto de uno con
  // paquete activo: mandarlo a "Armar mi mes" con 0 créditos solo lo
  // manda a un error ("No tienes créditos disponibles"). En vez de
  // eso, el panel le pide comprar su primer paquete.
  const tieneCompras = (comprasCount ?? 0) > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-gold">MI CUENTA</p>
        <h1 className="text-display-m text-cream">Hola, {usuario.nombre.split(" ")[0]}</h1>
        {tieneCompras && (
          <p className="text-[14px] text-muted">
            Tienes {saldo} {saldo === 1 ? "crédito disponible" : "créditos disponibles"}.
          </p>
        )}
      </div>

      {!tieneCompras ? (
        <div className="flex flex-col items-start gap-3 rounded-card-lg border border-line bg-surface p-7">
          <p className="text-[15px] font-medium text-cream">Todavía no tienes un paquete activo.</p>
          <p className="text-[14px] text-muted">
            Compra un paquete para empezar a recibir HotPot Factor — cada platillo equivale a un crédito.
          </p>
          <Link href="/paquetes" className="btn-primary rounded-control px-6 py-[13px] text-[15px]">
            Ver paquetes
          </Link>
        </div>
      ) : (
        <>
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
              href="/cuenta/calendario"
            />
          </div>

          <div className="flex flex-col gap-4 rounded-card-lg border border-line bg-surface p-7">
            <p className="text-[18px] font-medium text-cream">Accesos rápidos</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/cuenta/calendario" className="btn-primary rounded-control px-6 py-[13px] text-[15px]">
                Armar mi mes
              </Link>
              <Link href="/cuenta/entregas" className="btn-secondary rounded-control px-6 py-[13px] text-[15px]">
                Ver mis entregas
              </Link>
              <Link href="/cuenta/compras" className="btn-secondary rounded-control px-6 py-[13px] text-[15px]">
                Historial de compras
              </Link>
              <Link href="/paquetes" className="btn-secondary rounded-control px-6 py-[13px] text-[15px]">
                Comprar más créditos
              </Link>
            </div>
          </div>

          <p className="text-[13px] text-muted">
            {pedidosMesCount ?? 0} entregas programadas este mes · {usuario.colonia ?? "Agrega tu colonia en Mi perfil"}
          </p>
        </>
      )}
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
