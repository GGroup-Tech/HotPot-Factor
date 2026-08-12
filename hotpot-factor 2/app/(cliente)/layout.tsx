import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { ClienteChrome } from "@/app/components/cliente/ClienteChrome";

/**
 * `(cliente)` agrupa toda el área de cuenta (06-12): Resumen, Mi
 * calendario, Próximas entregas, Mis créditos, Mi perfil, Mis
 * compras. `requireUsuario()` es defensa en profundidad — middleware.ts
 * ya protege /cuenta/* a nivel de sesión, esto además confirma que
 * exista la fila en `usuarios` antes de pintar cualquier dato.
 * Mismo límite de ancho (1440px, el frame de Figma) que `(sitio)`.
 */
export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { user, usuario } = await requireUsuario();
  const supabase = await createClient();

  const { data: saldoRow } = await supabase
    .from("saldo_creditos")
    .select("saldo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-[1440px]">
      <ClienteChrome nombre={usuario.nombre} saldo={saldoRow?.saldo ?? 0}>
        {children}
      </ClienteChrome>
    </div>
  );
}
