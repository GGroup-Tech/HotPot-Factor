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
 */
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

/** Elimina un gasto (p.ej. si se capturó por error). */
export async function eliminarGasto(gastoId: string): Promise<AccionAdminResult> {
  await requireStaff();
  const admin = createAdminClient();
  const { error } = await admin.from("gastos").delete().eq("id", gastoId);
  if (error) return { ok: false, error: "No se pudo eliminar el gasto." };
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
  const fotoUrl = String(formData.get("foto_url") ?? "").trim() || null;
  const caloriasStr = String(formData.get("calorias") ?? "");
  const proteinaStr = String(formData.get("proteina_g") ?? "");
  const carbsStr = String(formData.get("carbs_g") ?? "");
  const grasaStr = String(formData.get("grasa_g") ?? "");

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const aEntero = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Math.round(Number(s)) : null);

  const { error } = await admin.from("platillos").insert({
    nombre,
    descripcion,
    foto_url: fotoUrl,
    calorias: aEntero(caloriasStr),
    proteina_g: aEntero(proteinaStr),
    carbs_g: aEntero(carbsStr),
    grasa_g: aEntero(grasaStr),
    activo: true,
  });

  if (error) return { ok: false, error: "No se pudo crear el platillo." };

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
