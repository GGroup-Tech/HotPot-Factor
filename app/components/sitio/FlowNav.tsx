import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** Nav simple del flujo de compra — Figma nodes 104:3, 105:3, 106:3. */
export async function FlowNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nombre: string | null = null;
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre")
      .eq("id", user.id)
      .maybeSingle();
    nombre = usuario?.nombre ?? null;
  }

  return (
    <>
      <div className="flex items-center justify-between px-[100px] py-6">
        <Link href="/" aria-label="HotPot Factor" className="flex items-center">
          <Image
            src="/logo-cream.png"
            alt="HotPot Factor"
            width={327}
            height={480}
            className="h-[48px] w-auto"
          />
        </Link>
        {nombre ? (
          <p className="text-[15px] text-muted">{nombre}</p>
        ) : (
          <Link href="/iniciar-sesion" className="text-[15px] text-muted hover:text-cream">
            Iniciar sesión
          </Link>
        )}
      </div>
      <div className="h-px w-full bg-line" />
    </>
  );
}
