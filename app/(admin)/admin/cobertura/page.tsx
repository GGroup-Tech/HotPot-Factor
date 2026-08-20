import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { CoberturaMapa } from "./CoberturaMapa";

/**
 * Cobertura — editor de mapa para los polígonos de zona de cobertura
 * (backlog #55, Fase 1, 2026-08-19). El match por nombre de colonia en
 * `lib/cobertura.ts` sigue siendo el aviso instantáneo en el
 * formulario de alta; el polígono dibujado aquí es la decisión real
 * al enviar ese formulario (ver `crear-cuenta/actions.ts`). Si no hay
 * ningún polígono activo todavía, el sistema sigue usando solo el
 * match de colonia — esta pantalla es aditiva, no rompe nada mientras
 * esté vacía.
 */
export default async function AdminCoberturaPage() {
  await requireStaff();
  const admin = createAdminClient();

  const { data: zonasRaw } = await admin
    .from("zonas_cobertura_poligonos")
    .select("id, nombre, puntos, activo")
    .order("creado_en", { ascending: false });

  const zonas = zonasRaw ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] text-muted">
        Dibuja el área real de cobertura sobre el mapa. Mientras no haya ninguna zona activa, el sistema sigue
        decidiendo cobertura por nombre de colonia (comportamiento anterior).
      </p>
      <CoberturaMapa zonas={zonas} />
    </div>
  );
}
