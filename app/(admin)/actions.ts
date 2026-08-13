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
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin
    .from("meses_contables")
    .update({ cerrado: false, cerrado_en: null, cerrado_por: null })
    .eq("anio", anio)
    .eq("mes", mes);
  if (error) return { ok: false, error: "No se pudo reabrir el mes." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

export async function crearCupon(formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const tipo = String(formData.get("tipo") ?? "porcentaje");
  const valor = Number(formData.get("valor") ?? "0");
  const aplicaA = String(formData.get("aplica_a") ?? "").trim() || null;
  const usosMax = formData.get("usos_max") ? Number(formData.get("usos_max")) : null;
  const usosPorUsuario = formData.get("usos_por_usuario") ? Number(formData.get("usos_por_usuario")) : null;
  const fechaInicio = String(formData.get("fecha_inicio") ?? "") || null;
  const fechaFin = String(formData.get("fecha_fin") ?? "") || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!codigo || !Number.isFinite(valor) || valor <= 0) {
    return { ok: false, error: "Revisa el código y el valor del cupón." };
  }

  const { error } = await admin.from("cupones").insert({
    codigo,
    tipo,
    valor,
    aplica_a: aplicaA,
    usos_max: usosMax,
    usos_por_usuario: usosPorUsuario,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    activo: true,
    notas,
  });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "Ya existe un cupón con ese código." };
    }
    return { ok: false, error: "No se pudo crear el cupón." };
  }

  revalidatePath("/admin/cupones");
  return { ok: true };
}

export async function alternarCupon(cuponId: string, activo: boolean): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("cupones").update({ activo }).eq("id", cuponId);
  if (error) return { ok: false, error: "No se pudo actualizar el cupón." };
  revalidatePath("/admin/cupones");
  return { ok: true };
}

const EXTENSIONES_FOTO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

async function subirFotoPlatillo(
  admin: ReturnType<typeof createAdminClient>,
  foto: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = EXTENSIONES_FOTO[foto.type];
  if (!ext) return { url: null, error: "La foto debe ser PNG o JPEG." };
  if (foto.size > 5 * 1024 * 1024) return { url: null, error: "La foto no debe pesar más de 5MB." };

  const nombreArchivo = `${crypto.randomUUID()}.${ext}`;
  const { error: subidaError } = await admin.storage.from("platillos").upload(nombreArchivo, foto, {
    contentType: foto.type,
    upsert: false,
  });
  if (subidaError) return { url: null, error: "No se pudo subir la foto." };

  const { data } = admin.storage.from("platillos").getPublicUrl(nombreArchivo);
  return { url: data.publicUrl, error: null };
}

export async function crearPlatillo(formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const caloriasStr = String(formData.get("calorias") ?? "");
  const proteinaStr = String(formData.get("proteina_g") ?? "");
  const carbsStr = String(formData.get("carbs_g") ?? "");
  const grasaStr = String(formData.get("grasa_g") ?? "");
  const grasaSaturadaStr = String(formData.get("grasa_saturada_g") ?? "");
  const fibraStr = String(formData.get("fibra_g") ?? "");
  const sodioStr = String(formData.get("sodio_mg") ?? "");
  const alergenos = String(formData.get("alergenos") ?? "").trim() || null;

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  let fotoUrl: string | null = null;
  const fotoFile = formData.get("foto");
  if (fotoFile instanceof File && fotoFile.size > 0) {
    const subida = await subirFotoPlatillo(admin, fotoFile);
    if (subida.error) return { ok: false, error: subida.error };
    fotoUrl = subida.url;
  }

  const aEntero = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Math.round(Number(s)) : null);

  const { error } = await admin.from("platillos").insert({
    nombre,
    descripcion,
    foto_url: fotoUrl,
    calorias: aEntero(caloriasStr),
    proteina_g: aEntero(proteinaStr),
    carbs_g: aEntero(carbsStr),
    grasa_g: aEntero(grasaStr),
    grasa_saturada_g: aEntero(grasaSaturadaStr),
    fibra_g: aEntero(fibraStr),
    sodio_mg: aEntero(sodioStr),
    alergenos,
    activo: true,
  });

  if (error) return { ok: false, error: "No se pudo crear el platillo." };

  revalidatePath("/admin/platillos");
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function actualizarPlatillo(platilloId: string, formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const caloriasStr = String(formData.get("calorias") ?? "");
  const proteinaStr = String(formData.get("proteina_g") ?? "");
  const carbsStr = String(formData.get("carbs_g") ?? "");
  const grasaStr = String(formData.get("grasa_g") ?? "");
  const grasaSaturadaStr = String(formData.get("grasa_saturada_g") ?? "");
  const fibraStr = String(formData.get("fibra_g") ?? "");
  const sodioStr = String(formData.get("sodio_mg") ?? "");
  const alergenos = String(formData.get("alergenos") ?? "").trim() || null;
  const activo = formData.get("activo") === "on";

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  let fotoUrl = String(formData.get("foto_url_actual") ?? "").trim() || null;
  const fotoFile = formData.get("foto");
  if (fotoFile instanceof File && fotoFile.size > 0) {
    const subida = await subirFotoPlatillo(admin, fotoFile);
    if (subida.error) return { ok: false, error: subida.error };
    fotoUrl = subida.url;
  }

  const aEntero = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Math.round(Number(s)) : null);

  const { error } = await admin
    .from("platillos")
    .update({
      nombre,
      descripcion,
      foto_url: fotoUrl,
      calorias: aEntero(caloriasStr),
      proteina_g: aEntero(proteinaStr),
      carbs_g: aEntero(carbsStr),
      grasa_g: aEntero(grasaStr),
      grasa_saturada_g: aEntero(grasaSaturadaStr),
      fibra_g: aEntero(fibraStr),
      sodio_mg: aEntero(sodioStr),
      alergenos,
      activo,
    })
    .eq("id", platilloId);

  if (error) return { ok: false, error: "No se pudo actualizar el platillo." };

  revalidatePath("/admin/platillos");
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function alternarPlatilloActivo(platilloId: string, activo: boolean): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("platillos").update({ activo }).eq("id", platilloId);
  if (error) return { ok: false, error: "No se pudo actualizar el platillo." };
  revalidatePath("/admin/platillos");
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function copiarMenuMesPasado(anio: number, mes: number): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const anioPasado = mes === 1 ? anio - 1 : anio;
  const mesPasado = mes === 1 ? 12 : mes - 1;

  const [{ data: menuPasado }, { data: comodinesPasado }] = await Promise.all([
    admin.from("menu_mes").select("dia_semana, platillo_id").eq("anio", anioPasado).eq("mes", mesPasado),
    admin.from("comodines_mes").select("platillo_id").eq("anio", anioPasado).eq("mes", mesPasado),
  ]);

  if ((menuPasado ?? []).length === 0 && (comodinesPasado ?? []).length === 0) {
    return { ok: false, error: "El mes pasado no tiene menú configurado para copiar." };
  }

  if (menuPasado && menuPasado.length > 0) {
    const filas = menuPasado
      .filter((f) => f.dia_semana != null && f.platillo_id != null)
      .map((f) => ({ anio, mes, dia_semana: f.dia_semana as number, platillo_id: f.platillo_id as string }));
    if (filas.length > 0) {
      const { error } = await admin.from("menu_mes").upsert(filas, { onConflict: "anio,mes,dia_semana" });
      if (error) return { ok: false, error: "No se pudo copiar el menú fijo." };
    }
  }

  if (comodinesPasado && comodinesPasado.length > 0) {
    for (const c of comodinesPasado) {
      const { data: existente } = await admin
        .from("comodines_mes")
        .select("id")
        .eq("anio", anio)
        .eq("mes", mes)
        .eq("platillo_id", c.platillo_id)
        .maybeSingle();
      if (!existente) {
        await admin.from("comodines_mes").insert({ anio, mes, platillo_id: c.platillo_id });
      }
    }
  }

  revalidatePath("/admin/menu");
  revalidatePath("/arma-tu-mes");
  revalidatePath("/cuenta/calendario");
  return { ok: true };
}
