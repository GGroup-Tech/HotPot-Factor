"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatoCorreoValido } from "@/lib/validacion";

export interface IniciarSesionState {
  error?: string;
}

export async function iniciarSesion(
  _prev: IniciarSesionState,
  formData: FormData,
): Promise<IniciarSesionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/cuenta");

  // Defensa extra del lado servidor — el formulario ya valida el
  // formato del correo antes de enviar, pero un `fetch` directo a
  // esta acción se saltaría esa validación de cliente.
  if (!formatoCorreoValido(email)) {
    return { error: "Ese correo no tiene un formato válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // A propósito NO se distingue "ese correo no existe" de
    // "la contraseña es incorrecta" — decirlo por separado permite a
    // cualquiera usar el login para averiguar qué correos sí tienen
    // cuenta (enumeración de cuentas), un problema real de seguridad.
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect(next);
}
