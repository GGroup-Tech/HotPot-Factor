import { FlowNav } from "@/app/components/sitio/FlowNav";
import { RestablecerContrasenaForm } from "./RestablecerContrasenaForm";

/**
 * A esta pantalla solo se llega desde el link del correo de
 * recuperación, vía `/auth/callback` (que ya canjeó el `code` PKCE
 * por una sesión real de tipo "recovery"). No se valida esa sesión
 * aquí en el Server Component — si el link ya expiró o se volvió a
 * usar, `restablecerContrasena()` simplemente falla con un mensaje
 * claro al intentar guardar la nueva contraseña, en vez de agregar
 * una verificación aparte que duplique esa misma lógica.
 */
export default async function RestablecerContrasenaPage({
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
          <h1 className="text-display-m text-cream">Elige tu nueva contraseña</h1>
        </div>
        <RestablecerContrasenaForm next={next ?? "/cuenta"} />
      </main>
    </div>
  );
}
