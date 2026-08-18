"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hayCobertura } from "@/lib/cobertura";

export interface CrearCuentaState {
  ok: boolean;
  error?: string;
  enListaEspera?: boolean;
  paqueteId?: string;
  requiereConfirmacion?: boolean;
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

  if (!nombre || !apellido || !email || !password || !colonia) {
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

  // Corregido 2026-08-18: esto antes usaba el cliente normal (anon +
  // sesión) con `.update()`, e IGNORABA el error si fallaba —
  // devolvía `ok: true` sin importar qué. Si Supabase Auth tiene
  // "Confirm email" activado, `signUp()` NO deja una sesión activa
  // hasta que el usuario confirma su correo; sin sesión, ese
  // `.update()` lo bloqueaba RLS en silencio (0 filas afectadas, sin
  // error explícito) y el flujo seguía de largo a /pago como si nada.
  // Resultado: se creaba la cuenta en auth.users pero la fila en
  // `usuarios` quedaba vacía — sin nombre, sin dirección, sin
  // colonia — la "cuenta fantasma" reportada. Como /paquetes decide
  // saltarse "Crear cuenta" con solo checar si hay sesión activa, la
  // siguiente vez que esa persona entraba ya logueada brincaba
  // directo a Pago sin que su perfil se hubiera completado nunca.
  //
  // Usar el cliente admin (service role) aquí evita depender por
  // completo de si ya hay sesión activa o no — el `id` viene
  // directo de `signUpData.user.id`, confiable sin importar el
  // estado de la sesión. `upsert` en vez de `update` también cubre
  // el caso de que el trigger `on_auth_user_created` no haya creado
  // la fila todavía (o no exista).
  const admin = createAdminClient();
  const { data: perfilGuardado, error: perfilError } = await admin
    .from("usuarios")
    .upsert({
      id: signUpData.user.id,
      nombre,
      apellido,
      telefono: telefono || null,
      colonia,
      calle_numero: calle || null,
      codigo_postal: codigoPostal || null,
      referencias: referencias || null,
      como_nos_conocio: comoNosConocio,
    })
    .select("id")
    .maybeSingle();

  if (perfilError || !perfilGuardado) {
    console.error("crearCuenta: no se pudo guardar el perfil", {
      usuarioId: signUpData.user.id,
      code: (perfilError as { code?: string } | null)?.code,
      message: perfilError?.message,
      details: (perfilError as { details?: string } | null)?.details,
      hint: (perfilError as { hint?: string } | null)?.hint,
    });
    return {
      ok: false,
      error: "Se creó tu cuenta pero no pudimos guardar tus datos. Contacta soporte antes de continuar.",
    };
  }

  // Si Supabase Auth requiere confirmar correo, `signUp()` no deja
  // sesión activa — seguir de largo a /pago produciría un dead-end
  // confuso ahí (el checkout necesita sesión). Se detiene aquí con un
  // mensaje claro en vez de dejar que el usuario choque con un error
  // sin contexto en el siguiente paso.
  if (!signUpData.session) {
    return { ok: false, requiereConfirmacion: true };
  }

  return { ok: true, paqueteId };
}
