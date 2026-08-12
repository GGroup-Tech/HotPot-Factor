import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Valida un código de cupón contra `cupones` (activo y no expirado). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get("codigo")?.trim();

  if (!codigo) {
    return NextResponse.json({ valido: false });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("cupones")
    .select("id, codigo, descuento_pct, descuento_mxn, activo, expira_at")
    .eq("activo", true)
    .ilike("codigo", codigo)
    .maybeSingle();

  if (!data || (data.expira_at && new Date(data.expira_at) < new Date())) {
    return NextResponse.json({ valido: false });
  }

  return NextResponse.json({
    valido: true,
    cuponId: data.id,
    descuentoPct: data.descuento_pct,
    descuentoMxn: data.descuento_mxn,
  });
}
