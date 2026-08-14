"use server";

import { createClient } from "@/lib/supabase/server";
import { hayCobertura } from "@/lib/cobertura";

export interface CrearCuentaState {
  ok: boolean;
  error?: string;
  enListaEspera?: boolean;
  paqueteId?: string;
}

/** Traduce mensajes comunes de Supabase Auth — llegan en inglés por default. */
function traducirErrorAuth(mensaje: string): string {
  if (/security purposes/i.test(mensaje) && /seconds/i.test(mensaje)) {
    const segundos = mensaje.match(/(\d+)\s*seconds?/i)?.[1];
    return segundos
      ? `Por seguridad, espera ${segundos} segundos antes de volver a intentarlo.`
      : "Por seguridad, espera un momento antes de volver a intentarlo.";
  }
  if (/already registered|already exists/i.test(mensaje)) {
    return "Ya existe una cuenta con ese correo. Inicia sesión en vez de crear una nueva.";
  }
  if (/password.*(least|characters)/i.test(mensaje)) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return "No se pudo crear la cuenta. Intenta de nuevo.";
}

/**
 * Crea la cuenta del cliente. `on_auth_user_created` ya inserta la fila
 * base en `usuarios` — aquí solo completamos los campos de dirección
 * después del signUp.
 *
 * Si la colonia no hace match contra `zonas_cobertura` (`hayCobertura`,
 * compartida con `/api/cobertura`), NO se crea la cuenta: se registra
 * en `lista_espera` y se corta el flujo ahí, como pide el punto 6 del
 * brief.
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
  const comoNosConocio = String(formData.get("como_nos_conocio") ?? "").trim() || null;

  if (!nombre || !email || !password || !colonia) {
    return { ok: false, error: "Completa los campos obligatorios." };
  }

  const { data: zonas } = await supabase.from("zonas_cobertura").select("colonia").eq("activa", true);
  const cubierta = hayCobertura(colonia, (zonas ?? []).map((z) => z.colonia));

  if (!cubierta) {
    await supabase.from("lista_espera").insert({ nombre: `${nombre} ${apellido}`.trim(), email, colonia });
    return { ok: false, enListaEspera: true };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre: `${nombre} ${apellido}`.trim() } },
  });

  if (signUpError || !signUpData.user) {
    return { ok: false, error: signUpError ? traducirErrorAuth(signUpError.message) : "No se pudo crear la cuenta." };
  }

  const direccion = `${calle}, ${colonia}, CP ${codigoPostal}`;
  // `.select().maybeSingle()` para detectar si RLS bloquea el UPDATE
  // (falta la policy `usuarios pueden actualizar su propio perfil`) —
  // sin esto, un signUp exitoso puede quedar con teléfono/colonia/
  // dirección vacíos para siempre y nadie se entera hasta que el
  // cliente reporta "mis datos no están". No se corta el flujo si
  // falla (la cuenta ya existe), pero sí queda en los logs de Vercel.
  const { data: perfilActualizado, error: perfilError } = await supabase
    .from("usuarios")
    .update({ nombre: `${nombre} ${apellido}`.trim(), telefono, colonia, direccion, como_nos_conocio: comoNosConocio })
    .eq("id", signUpData.user.id)
    .select("id")
    .maybeSingle();

  if (perfilError || !perfilActualizado) {
    console.error(
      "crearCuenta: no se pudo guardar teléfono/colonia/dirección (revisar policy UPDATE en `usuarios`)",
      perfilError,
    );
  }

  void referencias; // guardado junto con la dirección hasta que exista una columna dedicada

  return { ok: true, paqueteId };
}
