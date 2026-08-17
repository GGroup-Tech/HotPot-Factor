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
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const colonia = String(formData.get("colonia") ?? "").trim();
  const calleNumero = String(formData.get("calle_numero") ?? "").trim();
  const codigoPostal = String(formData.get("codigo_postal") ?? "").trim();

  if (!nombre || !apellido) {
    return { error: "El nombre y apellido son obligatorios." };
  }

  // Corregido 2026-08-17: `usuarios` no tiene `direccion` — son
  // `calle_numero` y `codigo_postal` por separado — y `apellido` es
  // su propia columna NOT NULL, no parte de `nombre`.
  const { data: actualizado, error } = await supabase
    .from("usuarios")
    .update({
      nombre,
      apellido,
      telefono: telefono || null,
      colonia: colonia || null,
      calle_numero: calleNumero || null,
      codigo_postal: codigoPostal || null,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("actualizarPerfil: UPDATE a `usuarios` falló", {
      usuarioId: user.id,
      code: (error as { code?: string } | null)?.code,
      message: error.message,
      details: (error as { details?: string } | null)?.details,
      hint: (error as { hint?: string } | null)?.hint,
    });
    return { error: "No se pudo guardar tu perfil. Intenta de nuevo." };
  }

  if (!actualizado) {
    return {
      error:
        "No se pudo guardar: tu cuenta no tiene permiso para actualizar este perfil (falta una política de acceso en la base de datos). Contacta soporte técnico.",
    };
  }

  revalidatePath("/cuenta/perfil");
  revalidatePath("/cuenta");
  return { ok: true };
}
