"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/supabase/staff";

export async function cerrarSesionStaff() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin-login");
}

export interface AccionAdminResult {
  ok: boolean;
  error?: string;
}

/**
 * Publica el menú fijo de un mes (`menu_mes.publicado = true`), que es
 * lo que hace visible ese menú a los clientes en "Arma tu mes" /
 * "Mi calendario" (ver `lib/calendario.ts` — solo cuenta filas con
 * `publicado = true`). Botón "Publicar" / "Publicar menú de {mes}" en
 * el Panel (A0) y en Menú del mes.
 *
 * Usa el cliente admin (service role) a propósito: `requireStaff()`
 * ya verificó arriba que quien llama es staff, así que este UPDATE no
 * depende de que exista una policy de RLS para staff en `menu_mes`
 * (el mismo tipo de gap que rompió "Mi perfil" y cancelar/editar
 * pedidos — ver `lib/supabase/admin.ts`). Toda escritura nueva del
 * panel admin sigue este mismo patrón.
 *
 * `menu_mes` usa `anio` + `mes` como columnas INTEGER separadas (no
 * un solo campo de fecha/texto) y el timestamp de publicación real se
 * llama `publicado_en`, no `publicado_at` — esquema confirmado
 * 2026-08-13 vía information_schema tras un error 42703 en producción.
 */
export async function publicarMenu(anio: number, mes: number): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("menu_mes")
    .update({ publicado: true, publicado_en: new Date().toISOString() })
    .eq("anio", anio)
    .eq("mes", mes)
    .select("id");

  if (error) return { ok: false, error: "No se pudo publicar el menú." };
  if (!data || data.length === 0) {
    return { ok: false, error: "No hay platillos configurados para ese mes todavía." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/menu");
  revalidatePath("/arma-tu-mes");
  revalidatePath("/cuenta/calendario");
  return { ok: true };
}
