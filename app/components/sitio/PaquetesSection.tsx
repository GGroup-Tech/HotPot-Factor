import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/**
 * Paquetes — Figma node 244:57. Los paquetes vienen de Supabase
 * (`paquetes`, activo = true) en vez de estar hardcodeados. El
 * paquete de en medio (por precio) se pinta como destacado, igual
 * que "Semanal" en el diseño.
 */
export async function PaquetesSection() {
  const supabase = await createClient();
  const { data: paquetes } = await supabase
    .from("paquetes")
    .select("id, nombre, creditos, precio_mxn")
    .eq("activo", true)
    .order("precio_mxn", { ascending: true });

  const lista = paquetes ?? [];
  const destacadoIndex = Math.floor((lista.length - 1) / 2);

  return (
    <section id="paquetes" className="flex flex-col items-start gap-14 px-[100px] py-[100px]">
      <div className="flex flex-col gap-4">
        <p className="text-[12px] font-medium tracking-[1.2px] text-gold">PAQUETES</p>
        <h2 className="text-display-l text-cream">Elige cuánto quieres comer</h2>
        <p className="w-[560px] text-[17px] leading-[28px] text-muted">
          Compras una vez, recibes créditos. Tus créditos no vencen nunca.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {lista.length === 0 && (
          <p className="text-[15px] text-muted">
            Los paquetes se están configurando. Vuelve pronto.
          </p>
        )}
        {lista.map((paquete, i) => {
          const destacado = i === destacadoIndex;
          const porPlatillo = Math.round(paquete.precio_mxn / paquete.creditos);
          return (
            <div
              key={paquete.id}
              className={
                destacado
                  ? "flex flex-col items-start gap-5 rounded-card-lg border-[1.5px] border-gold bg-[#1f1815] px-9 py-10"
                  : "flex flex-col items-start gap-5 rounded-card-lg border border-line bg-surface p-9"
              }
            >
              <div className="flex w-full items-center justify-between">
                <p className="text-[20px] font-medium text-cream">{paquete.nombre}</p>
                {destacado && (
                  <span className="rounded-pill bg-gold px-3 py-[6px] text-[10px] font-medium tracking-[0.8px] text-ink">
                    MÁS PEDIDO
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`font-display text-[46px] font-semibold ${destacado ? "text-gold" : "text-cream"}`}>
                  ${currency.format(paquete.precio_mxn)}
                </p>
                <p className="text-[14px] text-muted">MXN</p>
              </div>
              <p className="text-[15px] text-muted">
                {paquete.creditos} créditos&nbsp;&nbsp;·&nbsp;&nbsp;${porPlatillo} por platillo
              </p>
              <div className="h-px w-full bg-line" />
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center gap-[10px]">
                  <span className="size-[5px] rounded-full bg-gold" />
                  <p className="flex-1 text-[15px] leading-6 text-cream">
                    {paquete.creditos} platillos al mes
                  </p>
                </div>
                <div className="flex items-center gap-[10px]">
                  <span className="size-[5px] rounded-full bg-gold" />
                  <p className="flex-1 text-[15px] leading-6 text-cream">Entrega incluida</p>
                </div>
              </div>
              <Link
                href={`/crear-cuenta?paquete=${paquete.id}`}
                className={
                  destacado
                    ? "btn-primary w-full rounded-control py-[15px] text-[16px]"
                    : "btn-secondary w-full rounded-control py-[15px] text-[16px]"
                }
              >
                Comprar paquete
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
