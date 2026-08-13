import { requireStaff } from "@/lib/supabase/staff";
import { AdminChrome } from "@/app/components/admin/AdminChrome";

/**
 * `(admin)` agrupa todo el panel de staff (A0-AE, AD1-AD8).
 * `requireStaff()` es defensa en profundidad — middleware.ts ya
 * protege /admin/* a nivel de sesión + rol, esto además confirma la
 * fila en `staff` antes de pintar cualquier dato y le da a `AdminChrome`
 * el nombre a mostrar sin que cada página repita la query.
 *
 * Mismo límite de ancho (1440px, el frame de Figma) que `(cliente)` y
 * `(sitio)` — a esto le faltaba el `mx-auto max-w-[1440px]` que las
 * otras dos áreas ya tienen, así que en monitores grandes el shell de
 * admin se estiraba a todo el ancho de la pantalla en vez de quedarse
 * fijo al tamaño del diseño, y todo se veía "descuadrado" comparado
 * con una laptop. Con el cap, el layout es idéntico sin importar el
 * tamaño de pantalla — de más ancho solo sobra fondo a los lados, no
 * contenido estirado.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();

  return (
    <div className="mx-auto max-w-[1440px]">
      <AdminChrome nombreStaff={staff.nombre}>{children}</AdminChrome>
    </div>
  );
}
