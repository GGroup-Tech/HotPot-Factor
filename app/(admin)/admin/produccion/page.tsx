import { requireStaff } from "@/lib/supabase/staff";
import { EnConstruccion } from "@/app/components/admin/EnConstruccion";

export default async function AdminProduccionPage() {
  await requireStaff();
  return <EnConstruccion seccion="Producción" />;
}
