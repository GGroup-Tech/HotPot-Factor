import Link from "next/link";
import { FlowNav } from "@/app/components/sitio/FlowNav";
import { IniciarSesionForm } from "./IniciarSesionForm";

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <FlowNav />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 md:px-10 lg:px-[100px] py-20">
        <h1 className="text-display-m text-cream">Inicia sesión</h1>
        <IniciarSesionForm next={next ?? "/cuenta"} />
        <p className="text-[14px] text-muted">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/paquetes" className="text-gold hover:underline">
            Elige un paquete
          </Link>
        </p>
      </main>
    </div>
  );
}
