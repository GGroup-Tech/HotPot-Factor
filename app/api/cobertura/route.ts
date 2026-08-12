import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hayCobertura } from "@/lib/cobertura";

export const runtime = "nodejs";

/**
 * Valida cobertura por colonia contra `zonas_cobertura`, usado por el
 * banner en vivo del campo "Colonia" en 02 — Crear cuenta. La misma
 * lógica de match (`hayCobertura`) se usa también al enviar el
 * formulario (`crear-cuenta/actions.ts`), para que nunca se contradigan.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const colonia = searchParams.get("colonia")?.trim();

  if (!colonia) {
    return NextResponse.json({ cubierta: false });
  }

  const supabase = await createClient();
  const { data: zonas } = await supabase
    .from("zonas_cobertura")
    .select("colonia")
    .eq("activa", true);

  const cubierta = hayCobertura(colonia, (zonas ?? []).map((z) => z.colonia));

  return NextResponse.json({ cubierta });
}
