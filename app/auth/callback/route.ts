import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route Handler compartido para TODO link de correo de Supabase Auth
 * que necesite intercambiar un `code` por una sesión real: confirmar
 * cuenta al registrarse (`crearCuenta` → `signUp`) y recuperar
 * contraseña (`solicitarRecuperacion` → `resetPasswordForEmail`).
 * Los dos mandan al usuario aquí primero (con `?next=` distinto), no
 * directo a la pantalla final.
 *
 * `@supabase/ssr` usa el flujo PKCE por default — el link del correo
 * no trae la sesión directamente, trae un `code` de un solo uso que
 * hay que canjear con `exchangeCodeForSession`. Esto SOLO puede
 * hacerse en un Route Handler o Server Action (no en un Server
 * Component), porque necesita poder escribir la cookie de sesión
 * resultante — por eso este archivo existe aparte en vez de resolver
 * el `code` directo en la página de destino.
 *
 * Agregado 2026-08-20 junto con "recuperar contraseña". Antes,
 * `crearCuenta()` llamaba a `signUp()` sin `emailRedirectTo`, así que
 * el link de confirmación usaba el Site URL default de Supabase — sin
 * este callback, ese `code` nunca se canjeaba por una sesión real vía
 * el flujo explícito del proyecto.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/cuenta";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/iniciar-sesion?error=link-invalido`);
}
