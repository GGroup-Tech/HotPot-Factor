import Link from "next/link";
import { FlowNav } from "@/app/components/sitio/FlowNav";
import { RecuperarContrasenaForm } from "./RecuperarContrasenaForm";

/**
 * Pantalla nueva (2026-08-20) — "¿Olvidaste tu contraseña?" en ambos
 * logins (cliente y staff) llega aquí. Sirve para las dos audiencias
 * a la vez porque cliente y staff viven en la misma `auth.users` de
 * Supabase — no hay necesidad de una pantalla separada por rol.
 *
 * `next` es a dónde debe aterrizar el usuario DESPUÉS de terminar de
 * cambiar su contraseña (no antes) — por default `/cuenta`, pero
 * `/admin-login` manda `next=/admin` para que un staff que resetea su
 * password caiga directo en el panel en vez de tener que iniciar
 * sesión otra vez.
 */
export default async function RecuperarContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <FlowNav />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 md:px-10 lg:px-[100px] py-20">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-display-m text-cream">Recupera tu contraseña</h1>
          <p className="max-w-[440px] text-[14px] text-muted">
            Escribe el correo de tu cuenta y te mandamos un link para elegir una contraseña nueva.
          </p>
        </div>
        <RecuperarContrasenaForm next={next ?? "/cuenta"} />
        <Link href="/iniciar-sesion" className="text-[14px] text-muted hover:text-cream">
          ‹ Volver a iniciar sesión
        </Link>
      </main>
    </div>
  );
}
