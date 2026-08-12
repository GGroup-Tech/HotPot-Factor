import { requireStaff } from "@/lib/supabase/staff";
import { AdminChrome } from "@/app/components/admin/AdminChrome";

/**
 * `(admin)` agrupa todo el panel de staff (A0-AE, AD1-AD8).
 * `requireStaff()` es defensa en profundidad — middleware.ts ya
 * protege /admin/* a nivel de sesión + rol, esto además confirma la
 * fila en `staff` antes de pintar cualquier dato y le da a `AdminChrome`
 * el nombre a mostrar sin que cada página repita la query.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();

  return <AdminChrome nombreStaff={staff.nombre}>{children}</AdminChrome>;
}
