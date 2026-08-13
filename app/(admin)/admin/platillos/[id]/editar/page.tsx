import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditarPlatilloForm } from "../../PlatilloForms";

/** Pantalla dedicada para editar un platillo existente — ver nota en `../../page.tsx`. */
export default async function EditarPlatilloPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: platillo } = await admin
    .from("platillos")
    .select(
      "id, nombre, descripcion, foto_url, calorias, proteina_g, carbs_g, grasa_g, grasa_saturada_g, fibra_g, sodio_mg, alergenos, costo_mxn, activo",
    )
    .eq("id", id)
    .maybeSingle();

  if (!platillo) notFound();

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
