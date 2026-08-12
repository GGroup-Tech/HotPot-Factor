import { requireStaff } from "@/lib/supabase/staff";
import { EnConstruccion } from "@/app/components/admin/EnConstruccion";

export default async function AdminMenuPage() {
  await requireStaff();
  return <EnConstruccion seccion="Menú del mes" />;
}
