import { createClient } from "@/lib/supabase/server";
import { PlatilloCard, type PlatilloCardData } from "./PlatilloCard";

function primerDiaMesActual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Menú semanal — Figma node 244:122. Solo se muestra si `menu_mes` para
 * el mes actual tiene `publicado = true` (el menú se publica el día 20
 * del mes anterior). Mientras no esté publicado se muestra un estado
 * de espera en vez del grid.
 */
export async function MenuSemanalSection() {
  const supabase = await createClient();
  const mes = primerDiaMesActual();

  const { data: filas } = await supabase
    .from("menu_mes")
    .select("publicado, platillo_id, platillos(id, nombre, descripcion, imagen_url, etiqueta, kcal, proteina_g, carbohidratos_g, grasa_g)")
    .eq("mes", mes);

  const publicado = (filas ?? []).some((f) => f.publicado);
  const platillos: PlatilloCardData[] = publicado
    ? (filas ?? [])
        .map((f) => f.platillos as unknown as PlatilloCardData | null)
        .filter((p): p is PlatilloCardData => Boolean(p))
    : [];

  return (
    <section id="menu-semanal" className="flex flex-col gap-14 px-[100px] py-[100px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-4">
          <p className="text-[12px] font-medium tracking-[1.2px] text-gold">MENÚ DE LA SEMANA</p>
          <h2 className="w-[437px] text-display-l text-cream">
            {publicado ? "Elige entre estos platillos" : "El próximo menú está en camino"}
          </h2>
        </div>
        <div className="flex items-center gap-3 rounded-pill border border-line px-5 py-3">
          <span className="size-[7px] rounded-full bg-gold" />
          <p className="text-[14px] text-cream">
            {publicado
              ? "Elige antes del domingo"
              : "El menú se publica el día 20 de cada mes"}
          </p>
        </div>
      </div>
      {publicado ? (
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {platillos.map((p) => (
            <PlatilloCard key={p.id} platillo={p} />
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-muted">
          Estamos armando el menú del próximo mes. Vuelve el día 20 para elegir tus platillos.
        </p>
      )}
    </section>
  );
}
