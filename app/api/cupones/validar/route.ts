import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Valida un código de cupón contra `cupones` (activo y dentro de
 * vigencia). Esquema real confirmado 2026-08-13: `tipo` +`valor` en
 * vez de `descuento_pct`/`descuento_mxn`, y `fecha_inicio`/`fecha_fin`
 * en vez de `expira_at`. No valida `usos_max`/`usos_por_usuario` aquí
 * — este endpoint es anónimo (no sabe qué usuario está comprando) así
 * que el límite por usuario no se puede chequear todavía; el límite
 * total sí sería posible pero queda pendiente de conectar.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get("codigo")?.trim();

  if (!codigo) {
    return NextResponse.json({ valido: false });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("cupones")
    .select("id, codigo, tipo, valor, activo, fecha_inicio, fecha_fin")
    .eq("activo", true)
    .ilike("codigo", codigo)
    .maybeSingle();

  const hoy = new Date();
  const dentroDeVigencia =
    data &&
    (!data.fecha_inicio || new Date(data.fecha_inicio) <= hoy) &&
    (!data.fecha_fin || new Date(data.fecha_fin) >= hoy);

  if (!data || !dentroDeVigencia) {
    return NextResponse.json({ valido: false });
  }

  return NextResponse.json({
    valido: true,
    cuponId: data.id,
    descuentoPct: data.tipo === "porcentaje" ? data.valor : null,
    descuentoMxn: data.tipo === "monto_fijo" ? data.valor : null,
  });
}
