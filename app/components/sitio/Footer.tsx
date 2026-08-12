import Link from "next/link";
import { LOGO_CREAM_SRC } from "@/lib/brand/logo";

/** Footer — Figma node 244:195. */
export function Footer() {
  return (
    <footer className="flex flex-col gap-14 px-[100px] pb-11 pt-20">
      <div className="flex flex-col items-start justify-between gap-12 md:flex-row">
        <div className="flex w-[320px] flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_CREAM_SRC} alt="HotPot Factor" className="h-[64px] w-auto" />
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
      <div className="flex w-full items-center justify-between border-t border-line pt-7 text-[14px] text-muted">
        <p>© 2026 HotPot Factor. Todos los derechos reservados.</p>
        <div className="flex gap-6">
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
    </footer>
  );
}
