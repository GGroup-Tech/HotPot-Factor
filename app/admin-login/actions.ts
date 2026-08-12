"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminLoginState {
  error?: string;
}

/**
 * Login de staff. Reusa Supabase Auth (misma tabla `auth.users` que los
 * clientes) pero exige que también exista una fila en `staff` — si el
 * correo/contraseña son válidos pero la cuenta no es de staff, cierra
 * la sesión inmediatamente y no deja pasar. `middleware.ts` hace esta
 * misma verificación en cada request a `/admin/*`; esto es solo para
 * dar un mensaje de error claro en el propio formulario de login.
 */
export async function iniciarSesionStaff(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!staff) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel de administración." };
  }

  redirect("/admin");
}
