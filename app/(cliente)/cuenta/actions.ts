"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodificarDireccion, direccionParaGeocodificar } from "@/lib/geocoding";

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export interface ActualizarPerfilState {
  ok?: boolean;
  error?: string;
}

/**
 * Corregido 2026-08-17/18: `usuarios` no tiene `direccion` (son
 * `calle_numero` + `codigo_postal`) ni un solo campo `nombre`
 * concatenado (`apellido` es columna propia NOT NULL) — con los
 * nombres viejos esto fallaba SIEMPRE en silencio (columna
 * inexistente = PGRST204), por eso "los datos no se guardan".
 * `fecha_nac` agregada para el registro de edad.
 *
 * Geocodificación agregada 2026-08-19 (proyecto de ruteo óptimo +
 * WhatsApp al repartidor, Fase 1 — backlog #55): cada vez que el
 * cliente guarda su dirección se vuelve a geocodificar, para que
 * lat/lng nunca queden desactualizados si se muda o corrige un error
 * de captura. No bloqueante — ver `lib/geocoding.ts`.
 */
export async function actualizarPerfil(
  _prev: ActualizarPerfilState,
  formData: FormData,
): Promise<ActualizarPerfilState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const fechaNac = String(formData.get("fecha_nac") ?? "").trim();
  const colonia = String(formData.get("colonia") ?? "").trim();
  const calleNumero = String(formData.get("calle_numero") ?? "").trim();
  const codigoPostal = String(formData.get("codigo_postal") ?? "").trim();

  if (!nombre || !apellido) {
    return { error: "El nombre y apellido son obligatorios." };
  }

  const direccionTexto = direccionParaGeocodificar({
    calle_numero: calleNumero || null,
    colonia: colonia || null,
    codigo_postal: codigoPostal || null,
  });
  const coords = direccionTexto ? await geocodificarDireccion(direccionTexto) : null;

  // `.select().maybeSingle()` en vez de un `.update()` a secas: si RLS
  // bloquea el UPDATE (falta una policy `for update`), Postgres/PostgREST
  // no regresa error — regresa éxito con 0 filas afectadas. Sin este
  // chequeo el form dice "Guardado." aunque nada haya cambiado.
  const { data: actualizado, error } = await supabase
    .from("usuarios")
    .update({
      nombre,
      apellido,
      telefono: telefono || null,
      fecha_nac: fechaNac || null,
      colonia: colonia || null,
      calle_numero: calleNumero || null,
      codigo_postal: codigoPostal || null,
      // Si no se pudo geocodificar (sin API key, dirección no
      // encontrada, etc.) se deja lat/lng como estaban antes en vez
      // de borrarlos a `null` — mejor una coordenada vieja que
      // ninguna, mientras se corrige.
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("actualizarPerfil: UPDATE a `usuarios` falló", {
      usuarioId: user.id,
      code: (error as { code?: string } | null)?.code,
      message: error.message,
      details: (error as { details?: string } | null)?.details,
      hint: (error as { hint?: string } | null)?.hint,
    });
    return { error: "No se pudo guardar tu perfil. Intenta de nuevo." };
  }

  if (!actualizado) {
    return {
      error:
        "No se pudo guardar: tu cuenta no tiene permiso para actualizar este perfil (falta una política de acceso en la base de datos). Contacta soporte técnico.",
    };
  }

  revalidatePath("/cuenta/perfil");
  revalidatePath("/cuenta");
  return { ok: true };
}
