import { requireStaff } from "@/lib/supabase/staff";
import { EnConstruccion } from "@/app/components/admin/EnConstruccion";

export default async function AdminFinanzasPage() {
  await requireStaff();
  return <EnConstruccion seccion="Finanzas" />;
}
