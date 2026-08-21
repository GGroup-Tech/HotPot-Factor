"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface RestablecerContrasenaState {
  error?: string;
}

/**
 * Guarda la nueva contraseña. Depende de que ya exista una sesión de
 * tipo "recovery" en las cookies — la deja `/auth/callback` al canjear
 * el `code` del link de correo. Si el link ya expiró, ya se usó, o
 * alguien llega a esta URL sin pasar por ese flujo, `updateUser` falla
 * y se le pide pedir un link nuevo en vez de mostrar el error crudo de
 * Supabase.
 *
 * No se cierra sesión después de guardar — `updateUser` deja al
 * usuario con una sesión normal (ya no "recovery"), así que se manda
 * directo a `next` (su cuenta o el panel admin) en vez de forzarlo a
 * iniciar sesión de nuevo con la contraseña que acaba de elegir.
 */
export async function restablecerContrasena(
  _prev: RestablecerContrasenaState,
  formData: FormData,
): Promise<RestablecerContrasenaState> {
  const password = String(formData.get("password") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  const next = String(formData.get("next") ?? "/cuenta");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmar) {
    return { error: "Las dos contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Este link ya no es válido. Solicita uno nuevo desde \"¿Olvidaste tu contraseña?\"." };
  }

  redirect(next);
}
