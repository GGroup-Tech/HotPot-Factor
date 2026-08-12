import { redirect } from "next/navigation";
import { FlowNav } from "@/app/components/sitio/FlowNav";
import { Stepper } from "@/app/components/sitio/Stepper";
import { createClient } from "@/lib/supabase/server";
import { PagoClientShell } from "./PagoClientShell";

/** 03 — Pago. Figma node 106:2. */
export default async function PagoPage({
  searchParams,
}: {
  searchParams: Promise<{ paquete?: string }>;
}) {
  const { paquete: paqueteId } = await searchParams;
  if (!paqueteId) redirect("/paquetes");

  const supabase = await createClient();
  const { data: paquete } = await supabase
    .from("paquetes")
    .select("id, nombre, creditos, precio_mxn")
    .eq("id", paqueteId)
    .maybeSingle();

  if (!paquete) redirect("/paquetes");

  return (
    <div className="flex min-h-screen flex-col">
      <FlowNav />
      <Stepper activo={3} />
      <main className="flex gap-14 px-[100px] pb-[100px] pt-[60px]">
        <PagoClientShell paquete={paquete} />
      </main>
    </div>
  );
}
