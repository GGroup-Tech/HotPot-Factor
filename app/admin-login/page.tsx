import { AdminLoginForm } from "./AdminLoginForm";

/**
 * Login separado de staff (fuera de `(admin)`, así `middleware.ts` lo
 * excluye de la protección de `/admin/*` y siempre queda accesible).
 * `?error=no-autorizado` llega cuando alguien con sesión de cliente
 * (pero sin fila en `staff`) intenta entrar a una ruta /admin/*.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-ink px-6 py-20">
      <div className="flex flex-col items-center gap-2">
        <p className="text-eyebrow text-gold">ADMINISTRACIÓN</p>
        <h1 className="text-display-m text-cream">Panel de staff</h1>
      </div>
      {error === "no-autorizado" && (
        <p className="w-full max-w-[400px] rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-center text-[14px] text-danger">
          Esa cuenta no tiene acceso al panel de administración.
        </p>
      )}
      <AdminLoginForm />
    </div>
  );
}
