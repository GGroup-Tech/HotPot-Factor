import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { CrearPlatilloForm, PlatilloActivoBoton } from "./PlatilloForms";

/**
 * Platillos — catálogo maestro de platos. No estaba en el Figma
 * original ni en las 8 secciones pedidas explícitamente, pero sin
 * esta pantalla no hay ninguna forma de dar de alta un platillo nuevo
 * en todo el panel (Menú del mes y Cupones solo pueden ASIGNAR
 * platillos que ya existen) — hueco reportado por el usuario
 * 2026-08-13 ("no me deja añadir platillos").
 *
 * Esquema real de `platillos` confirmado 2026-08-13 vía
 * information_schema: id, nombre, descripcion, foto_url, calorias,
 * proteina_g, carbs_g, grasa_g, activo, creado_en.
 */
export default async function AdminPlatillosPage() {
  await requireStaff();
  const admin = createAdminClient();

  const { data: platillosRaw } = await admin
    .from("platillos")
    .select("id, nombre, descripcion, calorias, proteina_g, carbs_g, grasa_g, activo")
    .order("nombre");

  const platillos = platillosRaw ?? [];
  const activos = platillos.filter((p) => p.activo).length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] text-muted">
        {platillos.length} platillos · {activos} activos
      </p>

      <div className="w-full overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[1px] text-gold">
              <th className="px-5 py-3.5 font-medium">Nombre</th>
              <th className="px-5 py-3.5 font-medium">Descripción</th>
              <th className="px-5 py-3.5 font-medium">Nutrición</th>
              <th className="px-5 py-3.5 font-medium">Estado</th>
              <th className="px-5 py-3.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {platillos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[14px] text-muted">
                  Todavía no hay platillos en el catálogo.
                </td>
              </tr>
            ) : (
              platillos.map((p) => (
                <tr key={p.id} className="border-b border-line text-[13px] text-cream last:border-b-0">
                  <td className="px-5 py-3.5 font-medium">{p.nombre}</td>
                  <td className="max-w-[280px] px-5 py-3.5 text-muted">{p.descripcion ?? "—"}</td>
                  <td className="px-5 py-3.5 text-muted">
                    {p.calorias != null
                      ? `${p.calorias}kcal · ${p.proteina_g ?? 0}g prot · ${p.carbs_g ?? 0}g carb · ${p.grasa_g ?? 0}g grasa`
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`pill border ${p.activo ? "border-success text-success" : "border-line text-muted"}`}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <PlatilloActivoBoton platilloId={p.id} activo={p.activo} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[18px] font-medium text-cream">Crear platillo</p>
      <CrearPlatilloForm />
    </div>
  );
}
