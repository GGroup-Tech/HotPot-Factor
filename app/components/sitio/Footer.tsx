import Image from "next/image";
import Link from "next/link";

/**
 * Footer — Figma node 244:195. Igual que el Hero, es una fila de
 * piezas de tamaño fijo con `justify-between` — en monitores anchos
 * eso separaba demasiado las columnas, así que va dentro del mismo
 * `max-w-[1440px] mx-auto` que el resto de las composiciones fijas.
 */
export function Footer() {
  return (
    <footer className="px-6 pb-11 pt-16 md:px-10 lg:px-[100px] lg:pt-20">
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-14">
      <div className="flex flex-col flex-wrap items-start justify-between gap-10 md:flex-row md:gap-12">
        <div className="flex w-full max-w-[320px] md:w-[320px] flex-col gap-4">
          <Image
            src="/logo-cream.png"
            alt="HotPot Factor"
            width={327}
            height={480}
            className="h-[64px] w-auto"
          />
          <p className="text-[15px] leading-[25px] text-muted">
            Comida real, preparada fresca cada semana y entregada en tu puerta.
          </p>
        </div>
        <div className="flex flex-col gap-[14px]">
          <p className="text-eyebrow text-gold">PRODUCTO</p>
          <Link href="/#menu-semanal" className="text-[15px] text-muted hover:text-cream">
            Menú semanal
          </Link>
          <Link href="/#paquetes" className="text-[15px] text-muted hover:text-cream">
            Paquetes
          </Link>
          <Link href="/#como-funciona" className="text-[15px] text-muted hover:text-cream">
            Cómo funciona
          </Link>
        </div>
        <div className="flex flex-col gap-[14px]">
          <p className="text-eyebrow text-gold">EMPRESA</p>
          <Link href="/#nosotros" className="text-[15px] text-muted hover:text-cream">
            Nosotros
          </Link>
          <span className="text-[15px] text-muted">Blog</span>
        </div>
        <div className="flex flex-col gap-[14px]">
          <p className="text-eyebrow text-gold">CONTACTO</p>
          <a href="mailto:hola@hotpotfactor.mx" className="text-[15px] text-muted hover:text-cream">
            hola@hotpotfactor.mx
          </a>
          <span className="text-[15px] text-muted">+52 81 0000 0000</span>
        </div>
      </div>
      <div className="flex w-full flex-col gap-4 border-t border-line pt-7 text-[14px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 HotPot Factor. Todos los derechos reservados.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacidad" className="hover:text-cream">
            Aviso de privacidad
          </Link>
          <Link href="/terminos" className="hover:text-cream">
            Términos y condiciones
          </Link>
          <Link href="/admin-login" className="hover:text-cream">
            Acceso staff
          </Link>
        </div>
      </div>
    </div>
    </footer>
  );
}
