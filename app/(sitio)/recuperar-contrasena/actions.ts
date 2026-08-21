"use server";

import { createClient } from "@/lib/supabase/server";
import { formatoCorreoValido } from "@/lib/validacion";

export interface RecuperarContrasenaState {
  enviado?: boolean;
  error?: string;
}

/**
 * Manda el correo de recuperación de contraseña — Resend lo entrega
 * (mismo transporte SMTP que ya se configuró para confirmación de
 * cuenta), Supabase Auth genera y valida el link.
 *
 * SIEMPRE regresa `enviado: true` si el formato del correo es válido,
 * exista o no una cuenta con ese correo — `resetPasswordForEmail` de
 * Supabase ya se comporta así por diseño (no revela si el correo
 * existe), y el mensaje genérico en el formulario mantiene esa misma
 * garantía de cara al usuario. Nunca reveles "ese correo no tiene
 * cuenta" aquí: eso permite enumerar cuentas reales.
 */
export async function solicitarRecuperacion(
  _prev: RecuperarContrasenaState,
  formData: FormData,
): Promise<RecuperarContrasenaState> {
  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "/cuenta");

  if (!formatoCorreoValido(email)) {
    return { error: "Ese correo no tiene un formato válido." };
  }

  const supabase = await createClient();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hotpotfactor.com";
  const destinoFinal = `/restablecer-contrasena?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=${encodeURIComponent(destinoFinal)}`,
  });

  // El único error real que Supabase regresa aquí en la práctica es
  // rate limiting ("espera X segundos") — cualquier otra cosa (correo
  // no registrado, etc.) la absorbe en silencio y regresa éxito, así
  // que se respeta ese mismo comportamiento en vez de exponer el
  // error crudo.
  if (error && /security purposes/i.test(error.message) && /seconds/i.test(error.message)) {
    const segundos = error.message.match(/(\d+)\s*seconds?/i)?.[1];
    return {
      error: segundos
        ? `Por seguridad, espera ${segundos} segundos antes de volver a intentarlo.`
        : "Por seguridad, espera un momento antes de volver a intentarlo.",
    };
  }

  return { enviado: true };
}
