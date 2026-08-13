import { requireUsuario } from "@/lib/supabase/staff";
import { createClient } from "@/lib/supabase/server";
import { ClienteChrome } from "@/app/components/cliente/ClienteChrome";

/**
 * `(cliente)` agrupa toda el área de cuenta (06-12): Resumen, Mi
 * calendario, Próximas entregas, Mis créditos, Mi perfil, Mis
 * compras. `requireUsuario()` es defensa en profundidad — middleware.ts
 * ya protege /cuenta/* a nivel de sesión, esto además confirma que
 * exista la fila en `usuarios` antes de pintar cualquier dato.
 * Por decisión explícita del usuario (2026-08-13): ya no se limita a
 * 1440px fijos, igual que `(sitio)` y `(admin)` — `ClienteChrome` ya
 * reparte sidebar fijo + contenido `flex-1`, así que llena cualquier
 * ancho de pantalla sin dejar franjas vacías.
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
    <ClienteChrome nombre={usuario.nombre} saldo={saldoRow?.saldo ?? 0}>
      {children}
    </ClienteChrome>
  );
}
