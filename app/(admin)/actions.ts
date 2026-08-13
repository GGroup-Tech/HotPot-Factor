"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/supabase/staff";

export async function cerrarSesionStaff() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin-login");
}

export interface AccionAdminResult {
  ok: boolean;
  error?: string;
}

export async function publicarMenu(anio: number, mes: number): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("menu_mes")
    .update({ publicado: true, publicado_en: new Date().toISOString() })
    .eq("anio", anio)
    .eq("mes", mes)
    .select("id");

  if (error) return { ok: false, error: "No se pudo publicar el menú." };
  if (!data || data.length === 0) {
    return { ok: false, error: "No hay platillos configurados para ese mes todavía." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/menu");
  revalidatePath("/arma-tu-mes");
  revalidatePath("/cuenta/calendario");
  return { ok: true };
}

export async function actualizarMenuDia(
  anio: number,
  mes: number,
  diaSemana: number,
  platilloId: string,
): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const { error } = await admin
    .from("menu_mes")
    .upsert({ anio, mes, dia_semana: diaSemana, platillo_id: platilloId }, { onConflict: "anio,mes,dia_semana" });

  if (error) return { ok: false, error: "No se pudo guardar el platillo de ese día." };

  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  revalidatePath("/arma-tu-mes");
  revalidatePath("/cuenta/calendario");
  return { ok: true };
}

export async function agregarComodinMes(anio: number, mes: number, platilloId: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const { data: existente } = await admin
    .from("comodines_mes")
    .select("id")
    .eq("anio", anio)
    .eq("mes", mes)
    .eq("platillo_id", platilloId)
    .maybeSingle();
  if (existente) return { ok: true };

  const { error } = await admin.from("comodines_mes").insert({ anio, mes, platillo_id: platilloId });
  if (error) return { ok: false, error: "No se pudo agregar el comodín." };

  revalidatePath("/admin/menu");
  revalidatePath("/arma-tu-mes");
  revalidatePath("/cuenta/calendario");
  return { ok: true };
}

export async function quitarComodinMes(anio: number, mes: number, platilloId: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const { error } = await admin
    .from("comodines_mes")
    .delete()
    .eq("anio", anio)
    .eq("mes", mes)
    .eq("platillo_id", platilloId);
  if (error) return { ok: false, error: "No se pudo quitar el comodín." };

  revalidatePath("/admin/menu");
  revalidatePath("/arma-tu-mes");
  revalidatePath("/cuenta/calendario");
  return { ok: true };
}

export async function registrarGasto(formData: FormData): Promise<AccionAdminResult> {
  const { staff } = await requireStaff();
  const admin = createAdminClient();

  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const montoStr = String(formData.get("monto_mxn") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "") || null;
  const fecha = String(formData.get("fecha") ?? "");
  const proveedor = String(formData.get("proveedor") ?? "").trim() || null;
  const recurrente = formData.get("recurrente") === "on";

  const monto = Number(montoStr);
  if (!descripcion || !fecha || !Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "Revisa la descripción, el monto y la fecha." };
  }

  const fechaDate = new Date(`${fecha}T00:00:00`);

  const { error } = await admin.from("gastos").insert({
    descripcion,
    categoria_id: categoriaId,
    monto_mxn: monto,
    fecha,
    proveedor,
    recurrente,
    mes_contable: fechaDate.getMonth() + 1,
    anio_contable: fechaDate.getFullYear(),
    registrado_por: staff.id,
  });

  if (error) return { ok: false, error: "No se pudo registrar el gasto." };

  revalidatePath("/admin/finanzas");
  return { ok: true };
}

export async function eliminarGasto(gastoId: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("gastos").delete().eq("id", gastoId);
  if (error) return { ok: false, error: "No se pudo eliminar el gasto." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

export async function cerrarMesContable(anio: number, mes: number): Promise<AccionAdminResult> {
  const { staff } = await requireStaff();
  const admin = createAdminClient();

  const { data: existente } = await admin.from("meses_contables").select("id").eq("anio", anio).eq("mes", mes).maybeSingle();
  const payload = { anio, mes, cerrado: true, cerrado_en: new Date().toISOString(), cerrado_por: staff.id };
  const { error } = existente
    ? await admin.from("meses_contables").update(payload).eq("id", existente.id)
    : await admin.from("meses_contables").insert(payload);

  if (error) return { ok: false, error: "No se pudo cerrar el mes." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

export async function reabrirMesContable(anio: number, mes: number): Promise<AccionAdminResult> {
  await
