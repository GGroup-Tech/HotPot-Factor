import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditarPlatilloForm } from "../../PlatilloForms";

type PlatilloEditable = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  linea: "normal" | "fit" | "prime" | null;
  codigo_receta: string | null;
  rendimiento_porciones: number;
  calorias: number | null;
  proteina_g: number | null;
  carbs_g: number | null;
  grasa_g: number | null;
  grasa_saturada_g: number | null;
  fibra_g: number | null;
  sodio_mg: number | null;
  alergenos: string | null;
  costo_mxn: number | null;
  activo: boolean;
};

/**
 * Pantalla dedicada para editar un platillo existente — ver nota en
 * `../../page.tsx`. `linea`/`codigo_receta` agregadas 2026-08-19 al
 * reemplazar el catálogo inventado con las 150 recetas reales.
 */
export default async function EditarPlatilloPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();

  // El .select() con muchas columnas hace que el inferidor de tipos de
  // supabase-js pierda alguna del tipo resultante (build de Vercel
  // 2026-08-13: "Property 'costo_mxn' is missing in type...") — es un
  // límite conocido de cómo postgrest-js parsea strings de select muy
  // largos a nivel de tipos, no un error de datos reales (la columna
  // sí se trae en runtime). Se castea explícitamente al tipo real,
  // mismo patrón que ya se usa en el resto del proyecto para selects
  // que el inferidor no resuelve bien.
  const { data: platilloRaw } = await admin
    .from("platillos")
    .select(
      "id, nombre, descripcion, foto_url, linea, codigo_receta, rendimiento_porciones, calorias, proteina_g, carbs_g, grasa_g, grasa_saturada_g, fibra_g, sodio_mg, alergenos, costo_mxn, activo",
    )
    .eq("id", id)
    .maybeSingle();

  if (!platilloRaw) notFound();
  const platillo = platilloRaw as unknown as PlatilloEditable;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/platillos" className="w-fit text-[13px] text-muted hover:text-cream">
        ‹ Volver a Platillos
      </Link>
      <p className="text-[18px] font-medium text-cream">Editar platillo</p>
      <EditarPlatilloForm platillo={platillo} />
    </div>
  );
}
