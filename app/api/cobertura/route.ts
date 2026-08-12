import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** minúsculas + sin acentos, para comparar "López Mateos" con "lopez mateos". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const colonia = searchParams.get("colonia")?.trim();

  if (!colonia) {
    return NextResponse.json({ cubierta: false });
  }

  const supabase = await createClient();
  const { data: zonas, error } = await supabase
    .from("zonas_cobertura")
    .select("colonia")
    .eq("activa", true);

  const entrada = normalizar(colonia);
  const cubierta = (zonas ?? []).some(({ colonia: zonaColonia }) => {
    const zona = normalizar(zonaColonia);
    return zona.length > 0 && (entrada.includes(zona) || zona.includes(entrada));
  });

  // DEBUG TEMPORAL — quitar `debug` de la respuesta una vez resuelto el
  // problema de cobertura que no encontraba coincidencias en producción.
  return NextResponse.json({
    cubierta,
    zonasConfiguradas: (zonas ?? []).length,
    debug: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      anonKeyTail: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-8)
        : null,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
    },
  });
}
