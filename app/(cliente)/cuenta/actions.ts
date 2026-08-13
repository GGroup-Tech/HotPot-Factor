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

  // `.select().maybeSingle()` en vez de un `.update()` a secas: si RLS
  // bloquea el UPDATE (falta una policy `for update`), Postgres/PostgREST
  // no regresa error — regresa éxito con 0 filas afectadas. Sin este
  // chequeo el form dice "Guardado." aunque nada haya cambiado, que es
  // exactamente el bug reportado (los datos no se guardan y no hay
  // ningún mensaje de error que lo delate).
  const { data: actualizado, error } = await supabase
    .from("usuarios")
    .update({
      nombre,
      telefono: telefono || null,
      colonia: colonia || null,
      direccion: direccion || null,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "No se pudo guardar tu perfil. Intenta de nuevo." };
  }

  if (!actualizado) {
    // Ver nota arriba: esto es RLS bloqueando el UPDATE, no un error de
    // red. Falta la policy `usuarios pueden actualizar su propio perfil`
    // en la tabla `usuarios` (for update using (auth.uid() = id) with
    // check (auth.uid() = id)) — agregarla en el SQL Editor de Supabase.
    return {
      error:
        "No se pudo guardar: tu cuenta no tiene permiso para actualizar este perfil (falta una política de acceso en la base de datos). Contacta soporte técnico.",
    };
  }

  revalidatePath("/cuenta/perfil");
  return { ok: true };
}
