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

/**
 * Valida cobertura por colonia contra `zonas_cobertura`. Antes usaba
 * `.ilike()` en la base de datos, que en Postgres es case-insensitive
 * pero SÍ distingue acentos — "Lopez Mateos" (sin acento, como suele
 * escribir la gente) no hacía match con "López Mateos" en la tabla, y
 * el banner mostraba "fuera de cobertura" aunque la colonia sí
 * estuviera dada de alta. Por eso ahora se trae la tabla completa
 * (activa = true, es chica) y se compara normalizando acentos/mayúsculas
 * en JS, en ambas direcciones (substring de un lado o del otro), para
 * tolerar variaciones como "Del Valle" vs "Colonia del Valle".
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

  const entrada = normalizar(colonia);
  const cubierta = (zonas ?? []).some(({ colonia: zonaColonia }) => {
    const zona = normalizar(zonaColonia);
    return zona.length > 0 && (entrada.includes(zona) || zona.includes(entrada));
  });

  return NextResponse.json({ cubierta, zonasConfiguradas: (zonas ?? []).length });
}
