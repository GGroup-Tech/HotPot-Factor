"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export interface ActualizarPerfilState {
  ok?: boolean;
  error?: string;
}

export async function actualizarPerfil(
  _prev: ActualizarPerfilState,
  formData: FormData,
): Promise<ActualizarPerfilState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const colonia = String(formData.get("colonia") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }

  const { error } = await supabase
    .from("usuarios")
    .update({
      nombre,
      telefono: telefono || null,
      colonia: colonia || null,
      direccion: direccion || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "No se pudo guardar tu perfil. Intenta de nuevo." };
  }

  revalidatePath("/cuenta/perfil");
  return { ok: true };
}
