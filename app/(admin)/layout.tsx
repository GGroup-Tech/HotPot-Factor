import { requireStaff } from "@/lib/supabase/staff";
import { AdminChrome } from "@/app/components/admin/AdminChrome";

/**
 * `(admin)` agrupa todo el panel de staff (A0-AE, AD1-AD8).
 * `requireStaff()` es defensa en profundidad — middleware.ts ya
 * protege /admin/* a nivel de sesión + rol, esto además confirma la
 * fila en `staff` antes de pintar cualquier dato y le da a `AdminChrome`
 * el nombre a mostrar sin que cada página repita la query.
 *
 * A diferencia de `(sitio)` y `(cliente)` — que sí se capan a 1440px
 * porque son pantallas de marca/consumo diseñadas pixel a pixel en
 * Figma — el panel admin es una herramienta de trabajo (como Notion o
 * Linear), así que aquí NO se pone un ancho máximo fijo: el sidebar
 * (238px) queda fijo y el contenido (`flex-1` dentro de AdminChrome)
 * llena el 100% del ancho disponible en cualquier monitor. Las grillas
 * de tarjetas/tablas de cada página ya usan `w-full` + `grid-cols`
 * responsivos, así que se reparten solas sin dejar franjas vacías.
 * (Antes había un `mx-auto max-w-[1440px]` aquí — eso causaba
 * exactamente el problema reportado: en monitores anchos el contenido
 * se quedaba topado a 1440px con espacio muerto sobrante a un lado.)
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();

  return <AdminChrome nombreStaff={staff.nombre}>{children}</AdminChrome>;
}
