"use server";

import { createClient } from "@/lib/supabase/server";
import { hayCobertura } from "@/lib/cobertura";

export interface CrearCuentaState {
  ok: boolean;
  error?: string;
  enListaEspera?: boolean;
  paqueteId?: string;
}

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

  // Corregido 2026-08-17: `nombre`/`apellido` son columnas separadas
  // (NOT NULL) y no existe `direccion` — son `calle_numero` y
  // `codigo_postal`. Antes esto fallaba SIEMPRE en silencio, por eso
  // "los datos del registro no se guardaban".
  const { data: perfilActualizado, error: perfilError } = await supabase
    .from("usuarios")
    .update({
      nombre,
      apellido,
      telefono: telefono || null,
      colonia,
      calle_numero: calle || null,
      codigo_postal: codigoPostal || null,
      referencias: referencias || null,
      como_nos_conocio: comoNosConocio,
    })
    .eq("id", signUpData.user.id)
    .select("id")
    .maybeSingle();

  if (perfilError || !perfilActualizado) {
    console.error("crearCuenta: no se pudo guardar el resto del perfil", perfilError);
  }

  return { ok: true, paqueteId };
}
