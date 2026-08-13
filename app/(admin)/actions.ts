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
