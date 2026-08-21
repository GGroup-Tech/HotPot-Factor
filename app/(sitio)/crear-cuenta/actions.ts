"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hayCobertura } from "@/lib/cobertura";
import { geocodificarDireccion, direccionParaGeocodificar } from "@/lib/geocoding";
import { hayCoberturaPorPoligono } from "@/lib/cobertura-poligono";
import { formatoCorreoValido } from "@/lib/validacion";

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
  const fechaNac = String(formData.get("fecha_nac") ?? "").trim() || null;
  const calle = String(formData.get("calle") ?? "");
  const colonia = String(formData.get("colonia") ?? "");
  const codigoPostal = String(formData.get("codigo_postal") ?? "");
  const referencias = String(formData.get("referencias") ?? "");
  const paqueteId = String(formData.get("paquete_id") ?? "");
  const comoNosConocio = String(formData.get("como_nos_conocio") ?? "").trim() || null;

  if (!nombre || !apellido || !email || !password || !colonia) {
    return { ok: false, error: "Completa los campos obligatorios." };
  }

  // Defensa extra del lado servidor (2026-08-20) — el formulario ya
  // valida el formato del correo antes de enviar, pero esta acción es
  // el único lugar que de verdad importa para seguridad.
  if (!formatoCorreoValido(email)) {
    return { ok: false, error: "Ese correo no tiene un formato válido." };
  }

  // Geocodificación agregada 2026-08-19 (proyecto de ruteo óptimo +
  // WhatsApp al repartidor, Fase 1 — backlog #55) — se hace ANTES de
  // decidir cobertura porque ahora esa decisión la toma el polígono
  // real, no solo el nombre de la colonia. No bloqueante: sin
  // `GOOGLE_MAPS_API_KEY` o si Google no encuentra la dirección,
  // `coords` queda `null` y se usa el match de colonia como
  // respaldo — nunca se le niega el servicio a alguien solo porque la
  // geocodificación falló técnicamente.
  const direccionTexto = direccionParaGeocodificar({
    calle_numero: calle || null,
    colonia,
    codigo_postal: codigoPostal || null,
  });
  const coords = direccionTexto ? await geocodificarDireccion(direccionTexto) : null;

  // Cobertura agregada 2026-08-19 (a petición del usuario): el
  // polígono real es la decisión cuando hay coordenadas; el match de
  // colonia (viejo comportamiento) es el respaldo si no las hay.
  let cubierta: boolean;
  if (coords) {
    const { data: poligonosRaw } = await supabase
      .from("zonas_cobertura_poligonos")
      .select("puntos")
      .eq("activo", true);
    const poligonos = (poligonosRaw ?? []).map((p) => p.puntos);
    cubierta =
      poligonos.length > 0
        ? hayCoberturaPorPoligono(coords, poligonos)
        : await coberturaPorColonia(supabase, colonia);
  } else {
    cubierta = await coberturaPorColonia(supabase, colonia);
  }

  if (!cubierta) {
    await supabase.from("lista_espera").insert({ nombre: `${nombre} ${apellido}`.trim(), email, colonia });
    return { ok: false, enListaEspera: true };
  }

  // `emailRedirectTo` agregado 2026-08-20 junto con el flujo de
  // recuperar contraseña — antes no se mandaba, así que el link de
  // confirmación usaba el Site URL default configurado en Supabase en
  // vez de pasar por `/auth/callback` (que canjea el `code` PKCE por
  // una sesión real de forma explícita). `next=/cuenta` porque
  // confirmar el correo debe dejarlo directo en su panel.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hotpotfactor.com";
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre: `${nombre} ${apellido}`.trim() },
      emailRedirectTo: `${base}/auth/callback?next=/cuenta`,
    },
  });

  if (signUpError || !signUpData.user) {
    return { ok: false, error: signUpError ? traducirErrorAuth(signUpError.message) : "No se pudo crear la cuenta." };
  }

  // Corregido 2026-08-18: esto antes usaba el cliente normal (anon +
  // sesión) con `.update()`, e IGNORABA el error si fallaba —
  // devolvía `ok: true` sin importar qué. Si Supabase Auth tiene
  // "Confirm email" activado (confirmado que sí lo está), `signUp()`
  // NO deja una sesión activa hasta que el usuario confirma su
  // correo; sin sesión, ese `.update()` lo bloqueaba RLS en silencio
  // y el flujo seguía de largo a /pago como si nada. Resultado: se
  // creaba la cuenta en auth.users pero la fila en `usuarios` quedaba
  // vacía — la "cuenta fantasma" reportada.
  //
  // Usar el cliente admin (service role) aquí evita depender por
  // completo de si ya hay sesión activa o no. `upsert` en vez de
  // `update` también cubre el caso de que el trigger
  // `on_auth_user_created` no haya creado la fila todavía.
  const admin = createAdminClient();
  const { data: perfilGuardado, error: perfilError } = await admin
    .from("usuarios")
    .upsert({
      id: signUpData.user.id,
      nombre,
      apellido,
      telefono: telefono || null,
      fecha_nac: fechaNac,
      colonia,
      calle_numero: calle || null,
      codigo_postal: codigoPostal || null,
      referencias: referencias || null,
      como_nos_conocio: comoNosConocio,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
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
  // confuso ahí (el checkout necesita sesión).
  if (!signUpData.session) {
    return { ok: false, requiereConfirmacion: true };
  }

  return { ok: true, paqueteId };
}

async function coberturaPorColonia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  colonia: string,
): Promise<boolean> {
  const { data: zonas } = await supabase.from("zonas_cobertura").select("colonia").eq("activa", true);
  return hayCobertura(colonia, (zonas ?? []).map((z) => z.colonia));
}
