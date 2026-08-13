import { requireStaff } from "@/lib/supabase/staff";
import { EnConstruccion } from "@/app/components/admin/EnConstruccion";

export default async function AdminCuponesPage() {
  await requireStaff();
  return <EnConstruccion seccion="Cupones" />;
}
