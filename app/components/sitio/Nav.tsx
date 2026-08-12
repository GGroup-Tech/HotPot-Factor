import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LOGO_CREAM_SRC } from "@/lib/brand/logo";

/** Nav — Figma node 244:3. Mismo header en Landing v2 y en 01-05. */
export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between px-[100px] py-[26px]">
      <Link href="/" aria-label="HotPot Factor" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_CREAM_SRC} alt="HotPot Factor" className="h-[52px] w-auto" />
      </Link>
      <nav className="hidden items-center gap-[34px] text-[16px] text-muted md:flex">
        <Link href="/#menu-semanal" className="hover:text-cream">
          Menú semanal
        </Link>
        <Link href="/#paquetes" className="hover:text-cream">
          Planes
        </Link>
        <Link href="/#nosotros" className="hover:text-cream">
          Nosotros
        </Link>
      </nav>
      <div className="flex items-center gap-5">
        {user ? (
          <Link href="/cuenta" className="text-[16px] text-cream hover:text-gold">
            Mi cuenta
          </Link>
        ) : (
          <Link href="/iniciar-sesion" className="text-[16px] text-cream hover:text-gold">
            Iniciar sesión
          </Link>
        )}
        <Link href="/paquetes" className="btn-primary rounded-control px-6 py-[13px] text-[16px]">
          Comenzar
        </Link>
      </div>
    </header>
  );
}
