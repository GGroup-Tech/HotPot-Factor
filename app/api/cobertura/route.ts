import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Valida cobertura por colonia (ilike contra `zonas_cobertura`).
 * Usado por el campo "Colonia" en 02 — Crear cuenta para mostrar el
 * banner de cobertura en vivo mientras el usuario escribe.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const colonia = searchParams.get("colonia")?.trim();

  if (!colonia) {
    return NextResponse.json({ cubierta: false });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("zonas_cobertura")
    .select("id, colonia")
    .eq("activa", true)
    .ilike("colonia", `%${colonia}%`)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ cubierta: Boolean(data) });
}
