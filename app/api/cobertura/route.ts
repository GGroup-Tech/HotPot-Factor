import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hayCobertura } from "@/lib/cobertura";

export const runtime = "nodejs";

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
