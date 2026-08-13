import Link from "next/link";
import { requireStaff } from "@/lib/supabase/staff";
import { CrearPlatilloForm } from "../PlatilloForms";

export default async function NuevoPlatilloPage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/platillos" className="w-fit text-[13px] text-muted hover:text-cream">
        ‹ Volver a Platillos
      </Link>
      <p className="text-[18px] font-medium text-cream">Agregar platillo</p>
      <CrearPlatilloForm />
    </div>
  );
}
