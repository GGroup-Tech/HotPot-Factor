import { FlowNav } from "@/app/components/sitio/FlowNav";
import { Stepper } from "@/app/components/sitio/Stepper";
import { createClient } from "@/lib/supabase/server";
import { CrearCuentaForm } from "./CrearCuentaForm";

const currency = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** 02 — Crear cuenta. Figma node 105:2. */
export default async function CrearCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ paquete?: string }>;
}) {
  const { paquete: paqueteId } = await searchParams;
  const supabase = await createClient();

  const { data: paquete } = paqueteId
    ? await supabase
        .from("paquetes")
        .select("id, nombre, creditos, precio_mxn")
        .eq("id", paqueteId)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex min-h-screen flex-col">
      <FlowNav />
      <Stepper activo={2} />
      <main className="flex gap-14 px-[100px] pb-[90px] pt-[60px]">
        <CrearCuentaForm paqueteId={paquete?.id ?? ""} />
        <aside className="w-[380px] shrink-0 rounded-card-lg border border-line bg-surface p-7">
          <p className="text-eyebrow text-gold">TU PAQUETE</p>
          {paquete ? (
            <>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[20px] font-medium text-cream">{paquete.nombre}</p>
                <p className="font-display text-[26px] font-semibold text-gold">
                  ${currency.format(paquete.precio_mxn)}
                </p>
              </div>
              <p className="mt-2 text-[14px] text-muted">
                {paquete.creditos} créditos&nbsp;&nbsp;·&nbsp;&nbsp;$
                {Math.round(paquete.precio_mxn / paquete.creditos)} por platillo
              </p>
              <div className="my-4 h-px w-full bg-line" />
              <p className="text-[14px] leading-[23px] text-muted">
                Después de pagar vas a elegir en qué días quieres recibir cada uno de tus {paquete.creditos} platillos.
              </p>
            </>
          ) : (
            <p className="mt-4 text-[14px] text-muted">
              Elige un paquete primero para ver el resumen aquí.
            </p>
          )}
        </aside>
      </main>
    </div>
  );
}
