"use server";

import { createClient } from "@/lib/supabase/server";

export interface CrearCuentaState {
  ok: boolean;
  error?: string;
  enListaEspera?: boolean;
  paqueteId?: string;
}

/**
 * Crea la cuenta del cliente. `on_auth_user_created` ya inserta la fila
 * base en `usuarios` — aquí solo completamos los campos de dirección
 * después del signUp.
 *
 * Si la colonia no está en `zonas_cobertura` (ilike), NO se crea la
 * cuenta: se registra en `lista_espera` y se corta el flujo ahí, como
 * pide el punto 6 del brief.
 */
export async function crearCuenta(
  _prev: CrearCuentaState,
  formData: FormData,
): Promise<CrearCuentaState> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "");
  const apellido = String(formData.get("apellido") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const telefono = String(formData.get("telefono") ?? "");
  const calle = String(formData.get("calle") ?? "");
  const colonia = String(formData.get("colonia") ?? "");
  const codigoPostal = String(formData.get("codigo_postal") ?? "");
  const referencias = String(formData.get("referencias") ?? "");
  const paqueteId = String(formData.get("paquete_id") ?? "");

  if (!nombre || !email || !password || !colonia) {
    return { ok: false, error: "Completa los campos obligatorios." };
  }

  const { data: zona } = await supabase
    .from("zonas_cobertura")
    .select("id")
    .eq("activa", true)
    .ilike("colonia", `%${colonia}%`)
    .limit(1)
    .maybeSingle();

  if (!zona) {
    await supabase.from("lista_espera").insert({ nombre: `${nombre} ${apellido}`.trim(), email, colonia });
    return { ok: false, enListaEspera: true };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre: `${nombre} ${apellido}`.trim() } },
  });

  if (signUpError || !signUpData.user) {
    return { ok: false, error: signUpError?.message ?? "No se pudo crear la cuenta." };
  }

  const direccion = `${calle}, ${colonia}, CP ${codigoPostal}`;
  await supabase
    .from("usuarios")
    .update({ nombre: `${nombre} ${apellido}`.trim(), telefono, colonia, direccion })
    .eq("id", signUpData.user.id);

  void referencias; // guardado junto con la dirección hasta que exista una columna dedicada

  return { ok: true, paqueteId };
}
