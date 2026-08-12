import Link from "next/link";
import { FlowNav } from "@/app/components/sitio/FlowNav";
import { Stepper } from "@/app/components/sitio/Stepper";
import { createClient } from "@/lib/supabase/server";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** 01 — Paquetes. Figma node 104:2. */
export default async function PaquetesFlowPage() {
  const supabase = await createClient();
  const { data: paquetes } = await supabase
    .from("paquetes")
    .select("id, nombre, creditos, precio_mxn")
    .eq("activo", true)
    .order("precio_mxn", { ascending: true });

  const lista = paquetes ?? [];
  const destacadoIndex = Math.floor((lista.length - 1) / 2);

  return (
    <div className="flex min-h-screen flex-col">
      <FlowNav />
      <Stepper activo={1} />
      <main className="flex flex-col items-start gap-11 px-6 md:px-10 lg:px-[100px] pb-[90px] pt-[70px]">
        <div className="flex flex-col gap-[14px]">
          <h1 className="text-display-l text-cream">Elige tu paquete</h1>
          <p className="w-full max-w-[600px] text-[17px] leading-[28px] text-muted">
            Cada platillo equivale a un crédito. Al pagar eliges en qué días quieres recibir tu comida.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-[22px] md:grid-cols-3">
          {lista.map((paquete, i) => {
            const destacado = i === destacadoIndex;
            const porPlatillo = Math.round(paquete.precio_mxn / paquete.creditos);
            return (
              <div
                key={paquete.id}
                className={
                  destacado
                    ? "flex flex-col items-start gap-[18px] rounded-card-lg border-[1.5px] border-gold bg-[#1f1815] px-8 py-9"
                    : "flex flex-col items-start gap-[18px] rounded-card-lg border border-line bg-surface p-8"
                }
              >
                <div className="flex w-full items-center justify-between">
                  <p className="text-[19px] font-medium text-cream">{paquete.nombre}</p>
                  {destacado && (
                    <span className="rounded-pill bg-gold px-[11px] py-[5px] text-[10px] font-medium tracking-[0.8px] text-ink">
                      MÁS PEDIDO
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={`font-display text-[42px] font-semibold ${destacado ? "text-gold" : "text-cream"}`}>
                    ${currency.format(paquete.precio_mxn)}
                  </p>
                  <p className="text-[13px] text-muted">MXN</p>
                </div>
                <p className="text-[14px] text-muted">
                  {paquete.creditos} créditos&nbsp;&nbsp;·&nbsp;&nbsp;${porPlatillo} por platillo
                </p>
                <div className="h-px w-full bg-line" />
                <div className="flex w-full flex-col gap-[11px]">
                  <div className="flex items-center gap-[10px]">
                    <span className="size-[5px] rounded-full bg-gold" />
                    <p className="flex-1 text-[14px] leading-[22px] text-cream">
                      {paquete.creditos} platillos al mes
                    </p>
                  </div>
                  <div className="flex items-center gap-[10px]">
                    <span className="size-[5px] rounded-full bg-gold" />
                    <p className="flex-1 text-[14px] leading-[22px] text-cream">Menú completo disponible</p>
                  </div>
                  <div className="flex items-center gap-[10px]">
                    <span className="size-[5px] rounded-full bg-gold" />
                    <p className="flex-1 text-[14px] leading-[22px] text-cream">Entrega incluida</p>
                  </div>
                </div>
                <Link
                  href={`/crear-cuenta?paquete=${paquete.id}`}
                  className={
                    destacado
                      ? "btn-primary w-full rounded-control py-[14px] text-[15px]"
                      : "btn-secondary w-full rounded-control py-[14px] text-[15px]"
                  }
                >
                  Elegir paquete
                </Link>
              </div>
            );
          })}
        </div>
        <div className="flex w-full items-center gap-3 rounded-card-sm border border-line bg-surface px-6 py-[18px]">
          <span className="size-[6px] rounded-full bg-muted" />
          <p className="flex-1 text-[15px] text-muted">
            Tus créditos no vencen. Si un mes no los usas todos, los conservas para el siguiente.
          </p>
        </div>
      </main>
    </div>
  );
}
