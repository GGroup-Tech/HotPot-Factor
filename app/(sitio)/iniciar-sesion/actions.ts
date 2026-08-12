"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect(next);
}
