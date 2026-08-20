"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/supabase/staff";
import type { PedidoEstado } from "@/types/database";

export async function cerrarSesionStaff() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin-login");
}

export interface AccionAdminResult {
  ok: boolean;
  error?: string;
}

/**
 * Publica el menú fijo de un mes (`menu_mes.publicado = true`), que es
 * lo que hace visible ese menú a los clientes en "Arma tu mes" /
 * "Mi calendario" (ver `lib/calendario.ts` — solo cuenta filas con
 * `publicado = true`). Botón "Publicar" / "Publicar menú de {mes}" en
 * el Panel (A0) y en Menú del mes.
 *
 * Usa el cliente admin (service role) a propósito: `requireStaff()`
 * ya verificó arriba que quien llama es staff, así que este UPDATE no
 * depende de que exista una policy de RLS para staff en `menu_mes`
 * (el mismo tipo de gap que rompió "Mi perfil" y cancelar/editar
 * pedidos — ver `lib/supabase/admin.ts`). Toda escritura nueva del
 * panel admin sigue este mismo patrón.
 *
 * `menu_mes` usa `anio` + `mes` como columnas INTEGER separadas (no
 * un solo campo de fecha/texto) y el timestamp de publicación real se
 * llama `publicado_en`, no `publicado_at` — esquema confirmado
 * 2026-08-13 vía information_schema tras un error 42703 en producción.
 */
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

/**
 * Asigna/cambia el platillo fijo de un día de la semana para un mes.
 * `menu_mes` tiene UNIQUE(anio, mes, dia_semana) (confirmado por el
 * error 23505 que disparó ese descubrimiento de esquema), así que un
 * upsert sobre esas tres columnas es exactamente "crea si no existe,
 * si existe solo cambia el platillo". No se toca `publicado` en el
 * upsert a propósito: si el mes ya está publicado y el staff edita un
 * día, no queremos des-publicarlo por accidente; para una fila nueva
 * se asume que `publicado` tiene DEFAULT false en la base (si no lo
 * tiene, esto fallará con un error de columna NOT NULL — en ese caso
 * hay que agregar el default en la base, no adivinar aquí otra vez).
 */
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

/** Agrega un platillo a la lista de comodines válidos de un anio/mes. */
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

/** Quita un platillo de la lista de comodines de un anio/mes. */
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

/**
 * Registra un gasto. Esquema real confirmado 2026-08-13 vía
 * information_schema: `gastos` no tiene columna de "gasto diferido"
 * ni de "notas" (aunque el mock de Figma sí las mostraba) — se omiten
 * esos dos campos del formulario en vez de fingir que se guardan.
 * `mes_contable`/`anio_contable` se derivan de `fecha` al crear (no
 * hay control aparte en el modal original para desacoplarlos).
 *
 * Corregido 2026-08-19 (auditoría de Finanzas): `categoria_id` es
 * NOT NULL en la base real (confirmado vía information_schema), pero
 * el formulario tenía una opción "Sin categoría" que mandaba `null` —
 * eso hacía fallar el insert SIEMPRE que se eligiera esa opción, sin
 * ningún aviso claro más que el error genérico. Ahora se valida que
 * venga una categoría antes de intentar el insert (y el <select> del
 * formulario en FinanzasClientForms.tsx ya no ofrece "Sin categoría").
 */
export async function registrarGasto(formData: FormData): Promise<AccionAdminResult> {
  const { staff } = await requireStaff();
  const admin = createAdminClient();

  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const montoStr = String(formData.get("monto_mxn") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "");
  const proveedor = String(formData.get("proveedor") ?? "").trim() || null;
  const recurrente = formData.get("recurrente") === "on";
  const pagado = formData.get("pagado") === "on";
  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "").trim() || null;

  const monto = Number(montoStr);
  if (!descripcion || !categoriaId || !fecha || !Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "Revisa la descripción, la categoría, el monto y la fecha." };
  }

  const fechaDate = new Date(`${fecha}T00:00:00`);

  const { error } = await admin.from("gastos").insert({
    descripcion,
    categoria_id: categoriaId,
    monto_mxn: monto,
    fecha,
    proveedor,
    recurrente,
    pagado,
    fecha_vencimiento: pagado ? null : fechaVencimiento,
    mes_contable: fechaDate.getMonth() + 1,
    anio_contable: fechaDate.getFullYear(),
    registrado_por: staff.id,
  });

  if (error) return { ok: false, error: "No se pudo registrar el gasto." };

  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Elimina un gasto (p.ej. si se capturó por error). */
export async function eliminarGasto(gastoId: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("gastos").delete().eq("id", gastoId);
  if (error) return { ok: false, error: "No se pudo eliminar el gasto." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Marca/desmarca un gasto como pagado — base de Cuentas por pagar. */
export async function alternarGastoPagado(gastoId: string, pagado: boolean): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("gastos").update({ pagado }).eq("id", gastoId);
  if (error) return { ok: false, error: "No se pudo actualizar el gasto." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Cierra el mes contable (bloquea edición retroactiva — solo el estado, no hay lógica de reversión de gastos/pedidos todavía). */
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

/**
 * Crea un cupón. `tipo` y `aplica_a` son columnas `text` libres en la
 * base (no enums) — el formulario asume "porcentaje"/"monto_fijo"
 * para `tipo` por ser la convención más común; si tu base ya usa
 * otros valores, es cuestión de ajustar las opciones del select.
 */
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

/** Activa/desactiva un cupón existente. */
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

/**
 * Sube la foto de un platillo al bucket público "platillos" de Supabase
 * Storage (creado a mano por el usuario 2026-08-13) y regresa su URL
 * pública. Antes esto era un campo de texto para pegar una URL externa
 * — el usuario pidió subir el archivo directo (PNG/JPEG) en su lugar.
 * Límite de 5MB arbitrario, solo para evitar subidas gigantes desde el
 * panel; ajústalo si hace falta.
 */
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

/**
 * Crea un platillo nuevo en el catálogo. Esquema real de `platillos`
 * confirmado 2026-08-13 vía information_schema: `foto_url` (no
 * `imagen_url`), `calorias` (no `kcal`), `carbs_g` (no
 * `carbohidratos_g`) — no existen columnas `categoria`, `etiqueta` ni
 * `disponible_comodin` (se habían asumido sin verificar y nunca
 * existieron, lo que rompía por completo cualquier `.select()` anidado
 * que las pidiera).
 */
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
  const costoStr = String(formData.get("costo_mxn") ?? "");

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  let fotoUrl: string | null = null;
  const fotoFile = formData.get("foto");
  if (fotoFile instanceof File && fotoFile.size > 0) {
    const subida = await subirFotoPlatillo(admin, fotoFile);
    if (subida.error) return { ok: false, error: subida.error };
    fotoUrl = subida.url;
  }

  const aEntero = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Math.round(Number(s)) : null);
  const aDecimal = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Number(s) : null);

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
    costo_mxn: aDecimal(costoStr),
    activo: true,
  });

  if (error) return { ok: false, error: "No se pudo crear el platillo." };

  revalidatePath("/admin/platillos");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/**
 * Actualiza los datos de un platillo existente (pantalla "Editar" en
 * `/admin/platillos/[id]/editar`, y también desde el formulario rápido
 * en Menú del mes). Si no se sube una foto nueva, conserva la que ya
 * tenía (viene en el campo oculto `foto_url_actual`).
 */
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
  const costoStr = String(formData.get("costo_mxn") ?? "");
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
  const aDecimal = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Number(s) : null);

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
      costo_mxn: aDecimal(costoStr),
      activo,
    })
    .eq("id", platilloId);

  if (error) return { ok: false, error: "No se pudo actualizar el platillo." };

  revalidatePath("/admin/platillos");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/** Activa/desactiva un platillo (no lo borra — puede estar referenciado en pedidos pasados). */
export async function alternarPlatilloActivo(platilloId: string, activo: boolean): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("platillos").update({ activo }).eq("id", platilloId);
  if (error) return { ok: false, error: "No se pudo actualizar el platillo." };
  revalidatePath("/admin/platillos");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/**
 * Copia el menú fijo y los comodines del mes anterior al mes actual
 * (atajo "Copiar del mes pasado" en el Figma). No copia `publicado`
 * — el mes copiado siempre empieza sin publicar, aunque el mes de
 * origen ya lo estuviera.
 */
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

/**
 * Guarda la configuración financiera (tasa de ISR, capacidad de
 * producción diaria). Tabla singleton: si ya hay una fila, se
 * actualiza; si no, se crea la primera. Las lecturas siempre toman la
 * fila más reciente (`order("actualizado_en", { ascending: false }).limit(1)`).
 */
export async function guardarConfiguracionFinanciera(formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const isrStr = String(formData.get("isr_tasa_pct") ?? "");
  const capacidadStr = String(formData.get("capacidad_produccion_diaria") ?? "");
  const isrTasaPct = isrStr.trim() === "" ? null : Number(isrStr);
  const capacidad = capacidadStr.trim() === "" ? null : Math.round(Number(capacidadStr));

  const { data: existente } = await admin
    .from("configuracion_financiera")
    .select("id")
    .order("actualizado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = { isr_tasa_pct: isrTasaPct, capacidad_produccion_diaria: capacidad, actualizado_en: new Date().toISOString() };
  const { error } = existente
    ? await admin.from("configuracion_financiera").update(payload).eq("id", existente.id)
    : await admin.from("configuracion_financiera").insert(payload);

  if (error) return { ok: false, error: "No se pudo guardar la configuración." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Crea o reemplaza la meta de un mes específico (ingreso meta, margen meta, gasto operativo máx.). */
export async function guardarMetaMensual(anio: number, mes: number, formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const aDecimal = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : Number(s);
  };

  const { error } = await admin.from("metas_mensuales").upsert(
    {
      anio,
      mes,
      ingreso_meta_mxn: aDecimal(formData.get("ingreso_meta_mxn")),
      margen_meta_pct: aDecimal(formData.get("margen_meta_pct")),
      gasto_operativo_max_mxn: aDecimal(formData.get("gasto_operativo_max_mxn")),
    },
    { onConflict: "anio,mes" },
  );

  if (error) return { ok: false, error: "No se pudo guardar la meta del mes." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Da de alta un activo fijo (equipo, mobiliario, etc.) para depreciación y balance general. */
export async function crearActivoFijo(formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const valorStr = String(formData.get("valor_compra_mxn") ?? "");
  const fechaCompra = String(formData.get("fecha_compra") ?? "");
  const vidaUtilStr = String(formData.get("vida_util_meses") ?? "");

  const valor = Number(valorStr);
  const vidaUtil = Math.round(Number(vidaUtilStr));
  if (!nombre || !fechaCompra || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(vidaUtil) || vidaUtil <= 0) {
    return { ok: false, error: "Revisa el nombre, el valor de compra, la fecha y la vida útil." };
  }

  const { error } = await admin.from("activos_fijos").insert({
    nombre,
    valor_compra_mxn: valor,
    fecha_compra: fechaCompra,
    vida_util_meses: vidaUtil,
    activo: true,
  });

  if (error) return { ok: false, error: "No se pudo registrar el activo." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Da de baja (o reactiva) un activo fijo — no lo borra, para no perder el histórico de depreciación. */
export async function alternarActivoFijo(activoId: string, activo: boolean): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("activos_fijos").update({ activo }).eq("id", activoId);
  if (error) return { ok: false, error: "No se pudo actualizar el activo." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Da de alta una cuenta bancaria con su saldo actual, para el Balance general. */
export async function crearCuentaBancaria(formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const saldoStr = String(formData.get("saldo_mxn") ?? "");
  const saldo = Number(saldoStr);
  if (!nombre || !Number.isFinite(saldo)) {
    return { ok: false, error: "Revisa el nombre y el saldo." };
  }

  const { error } = await admin.from("cuentas_bancarias").insert({ nombre, saldo_mxn: saldo, actualizado_en: new Date().toISOString() });
  if (error) return { ok: false, error: "No se pudo registrar la cuenta." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Actualiza el saldo capturado de una cuenta bancaria (captura manual, no hay integración bancaria). */
export async function actualizarSaldoCuenta(cuentaId: string, formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const saldoStr = String(formData.get("saldo_mxn") ?? "");
  const saldo = Number(saldoStr);
  if (!Number.isFinite(saldo)) return { ok: false, error: "Revisa el saldo." };

  const { error } = await admin.from("cuentas_bancarias").update({ saldo_mxn: saldo, actualizado_en: new Date().toISOString() }).eq("id", cuentaId);
  if (error) return { ok: false, error: "No se pudo actualizar el saldo." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Elimina una cuenta bancaria (p.ej. si se capturó por error). */
export async function eliminarCuentaBancaria(cuentaId: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("cuentas_bancarias").delete().eq("id", cuentaId);
  if (error) return { ok: false, error: "No se pudo eliminar la cuenta." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Registra una aportación o retiro de capital de los socios, para el Balance general. */
export async function crearMovimientoCapital(formData: FormData): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  const tipo = String(formData.get("tipo") ?? "aportacion");
  const montoStr = String(formData.get("monto_mxn") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const nota = String(formData.get("nota") ?? "").trim() || null;

  const monto = Number(montoStr);
  if (!fecha || !Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "Revisa el monto y la fecha." };
  }

  const { error } = await admin.from("capital_movimientos").insert({ tipo, monto_mxn: monto, fecha, nota });
  if (error) return { ok: false, error: "No se pudo registrar el movimiento de capital." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/** Elimina un movimiento de capital (p.ej. si se capturó por error). */
export async function eliminarMovimientoCapital(movimientoId: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("capital_movimientos").delete().eq("id", movimientoId);
  if (error) return { ok: false, error: "No se pudo eliminar el movimiento." };
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/**
 * Activa/desactiva un cliente — antes no existía forma de marcar que
 * un cliente se dio de baja (`usuarios.activo` no tenía ningún botón
 * que lo escribiera). Necesario para poder calcular churn real en
 * Finanzas en vez de mostrar "no disponible".
 */
export async function alternarClienteActivo(usuarioId: string, activo: boolean): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios")
    .update({ activo, desactivado_en: activo ? null : new Date().toISOString() })
    .eq("id", usuarioId);
  if (error) return { ok: false, error: "No se pudo actualizar el cliente." };
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/**
 * Agregado 2026-08-19 (el usuario preguntó "cómo se le cambia el
 * estatus de un pedido de programado a entregado" — no existía forma
 * de hacerlo: Reparto, Producción y Pedidos solo MOSTRABAN el estado
 * en una pill, ninguna de las tres tenía un botón/acción que lo
 * escribiera). Esto importa más allá de la UI: "Costo de producción",
 * "Ingreso por porción" y "Capacidad de producción" en Finanzas se
 * calculan sobre `pedidos.estado = 'entregado'` — sin este botón, esos
 * números se iban a quedar en $0 para siempre sin importar cuántas
 * entregas reales hubiera, exactamente como pasó con "Ingresos" en el
 * dashboard por el bug de `created_at`.
 *
 * No valida transición (no exige pasar por 'en_produccion' primero) a
 * propósito — el negocio no tiene un paso de cocina que se registre
 * aparte, así que forzar una máquina de estados aquí sería inventar
 * una regla que no existe en la operación real.
 */
export async function actualizarEstadoPedido(pedidoId: string, estado: PedidoEstado): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("pedidos").update({ estado }).eq("id", pedidoId);
  if (error) return { ok: false, error: "No se pudo actualizar el estado del pedido." };
  revalidatePath("/admin/reparto");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/admin/finanzas");
  return { ok: true };
}

/**
 * Genera (o reutiliza, si ya hay uno vigente) el link público de
 * confirmación de entregas para UN DÍA completo — Fase 1 del proyecto
 * de ruteo óptimo + WhatsApp al repartidor (backlog #55). Un solo
 * link cubre todos los pedidos de `fecha` (no cancelados): el mismo
 * token se guarda en `pedidos.token_confirmacion` de cada uno de esos
 * pedidos, así que un único link (`/confirmar-entrega/[token]`) le
 * muestra al repartidor la lista completa del día, agrupada por
 * dirección — dos clientes distintos (roomies) pueden compartir
 * domicilio y aparecer en el mismo grupo aunque sean cuentas
 * separadas.
 *
 * Rediseñado 2026-08-19 a partir de un link por pedido (versión
 * anterior) — un link por día es mucho más práctico para el
 * repartidor que recibir uno distinto por cada entrega.
 *
 * Puente manual mientras no está listo el envío automático por
 * WhatsApp (Twilio): por ahora, el staff genera el link aquí, lo
 * copia, y lo manda a mano por WhatsApp — cuando la Fase 2 esté lista,
 * este mismo link es el que se mandará automáticamente cada mañana.
 *
 * Requiere la migración de `pedidos.token_confirmacion`/
 * `token_expira_en` SIN restricción UNIQUE (el mismo token ahora vive
 * en varias filas a la vez) — ver instrucciones de migración.
 */
export async function generarLinkConfirmacionDia(fecha: string): Promise<AccionAdminResult & { url?: string }> {
  await requireStaff();
  const admin = createAdminClient();

  const { data: pedidosDelDia, error: fetchError } = await admin
    .from("pedidos")
    .select("id, token_confirmacion, token_expira_en")
    .eq("fecha_entrega", fecha)
    .neq("estado", "cancelado");

  if (fetchError) return { ok: false, error: "No se pudo consultar los pedidos de ese día." };
  if (!pedidosDelDia || pedidosDelDia.length === 0) {
    return { ok: false, error: "No hay entregas programadas para ese día." };
  }

  // Reutiliza el token del día si ya hay uno vigente (evita invalidar
  // un link que el staff ya haya mandado por WhatsApp si vuelve a dar
  // clic por accidente) — si no, genera uno nuevo.
  const existente = pedidosDelDia.find(
    (p) => p.token_confirmacion && p.token_expira_en && new Date(p.token_expira_en) > new Date(),
  );
  const token = existente?.token_confirmacion ?? crypto.randomUUID();
  // Expira al final del día de entrega (23:59 hora del servidor) — no
  // tiene sentido que el link de la ruta de hoy siga vivo semanas
  // después.
  const expira = existente?.token_expira_en ?? new Date(`${fecha}T23:59:59`).toISOString();

  const { error: updateError } = await admin
    .from("pedidos")
    .update({ token_confirmacion: token, token_expira_en: expira })
    .in(
      "id",
      pedidosDelDia.map((p) => p.id),
    );

  if (updateError) return { ok: false, error: "No se pudo generar el link de confirmación." };

  // `www.hotpotfactor.com`, no `hotpotfactor.com` a secas — el apex
  // redirige (308) al subdominio con www (lo descubrimos con el
  // webhook de Stripe), y un link de WhatsApp que rebota con redirect
  // se ve mal / puede fallar según el cliente de WhatsApp.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hotpotfactor.com";
  return { ok: true, url: `${base}/confirmar-entrega/${token}` };
}

/**
 * Crea o actualiza un polígono de cobertura — dibujado a mano en el
 * editor de mapa del admin (`admin/cobertura`). `puntos` viene
 * directo del cliente (no de un `<form>`), por eso esta acción recibe
 * un objeto normal en vez de `FormData` — Next.js permite llamar
 * server actions así siempre que los argumentos sean serializables.
 *
 * Este polígono es lo que de verdad decide cobertura al crear una
 * cuenta (`crear-cuenta/actions.ts`) cuando la dirección se pudo
 * geocodificar — el match por nombre de colonia (`zonas_cobertura`,
 * tabla vieja) se queda solo como aviso instantáneo mientras el
 * cliente escribe y como respaldo si la geocodificación falla.
 */
export async function guardarPoligonoCobertura(
  id: string | null,
  nombre: string,
  puntos: { lat: number; lng: number }[],
): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();

  if (!nombre.trim() || puntos.length < 3) {
    return { ok: false, error: "Dale un nombre a la zona y dibuja al menos 3 puntos." };
  }

  const { error } = id
    ? await admin.from("zonas_cobertura_poligonos").update({ nombre, puntos }).eq("id", id)
    : await admin.from("zonas_cobertura_poligonos").insert({ nombre, puntos, activo: true });

  if (error) return { ok: false, error: "No se pudo guardar la zona." };
  revalidatePath("/admin/cobertura");
  return { ok: true };
}

/** Activa/desactiva un polígono sin borrarlo. */
export async function alternarPoligonoCobertura(id: string, activo: boolean): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("zonas_cobertura_poligonos").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la zona." };
  revalidatePath("/admin/cobertura");
  return { ok: true };
}

/** Elimina un polígono de cobertura (p.ej. si se dibujó por error). */
export async function eliminarPoligonoCobertura(id: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("zonas_cobertura_poligonos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la zona." };
  revalidatePath("/admin/cobertura");
  return { ok: true };
}
