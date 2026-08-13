import Image from "next/image";
import Link from "next/link";
import { ClienteSidebar } from "./ClienteSidebar";
import { SofiaChat } from "./SofiaChat";
import { cerrarSesion } from "@/app/(cliente)/cuenta/actions";

/**
 * Chrome compartido del área cliente: header simple (logo + saldo +
 * cerrar sesión) y nav lateral (columna en desktop, tabs con scroll
 * en móvil vía ClienteSidebar). `saldo` y `nombre` se pasan desde el
 * layout para no repetir la query en cada página.
 */
export function ClienteChrome({
  nombre,
  saldo,
  children,
}: {
  nombre: string;
  saldo: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-6 md:px-10 lg:px-[100px]">
        <Link href="/" aria-label="HotPot Factor" className="flex items-center">
          <Image
            src="/logo-cream.png"
            alt="HotPot Factor"
            width={327}
            height={480}
            className="h-[44px] w-auto"
          />
        </Link>
        <div className="flex items-center gap-4">
          <div className="pill hidden sm:flex">
            <span className="num text-[14px]">{saldo} créditos disponibles</span>
          </div>
          <p className="hidden text-[14px] text-muted md:block">{nombre}</p>
          <form action={cerrarSesion}>
            <button type="submit" className="text-[14px] text-muted hover:text-cream">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <div className="h-px w-full bg-line" />

      <div className="flex flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:flex-row lg:gap-10 lg:px-[100px] lg:py-10">
        <ClienteSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <SofiaChat />
    </div>
  );
}
