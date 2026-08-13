import { requireStaff } from "@/lib/supabase/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIAS_SEMANA_LARGO, MESES } from "@/lib/calendario";
import { DiaMenuForm, ComodinAgregarForm, ComodinQuitarBoton, AccionMenuBoton, NuevoPlatilloInline } from "./MenuClientForms";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" });

export default async function AdminMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireStaff();
  const admin = createAdminClient();
  const { mes: mesParam } = await searchParams;

  const hoy = new Date();
  let anio = hoy.getFullYear();
  let mesNum = hoy.getMonth() + 1;
  if (mesParam) {
    const [a, m] = mesParam.split("-").map(Number);
    if (a) anio = a;
    if (m) mesNum = m;
  }
  const mesAnteriorParam = mesNum === 1 ? `${anio - 1}-12` : `${anio}-${mesNum - 1}`;
  const mesSiguienteParam = mesNum === 12 ? `${anio + 1}-1` : `${anio}-${mesNum + 1}`;

  const [{ data: menuRaw }, { data: comodinesRaw }, { data: platillos }] = await Promise.all([
    admin
      .from("menu_mes")
      .select("dia_semana, publicado, publicado_en, platillo_id, platillos(id, nombre, descripcion, calorias, proteina_g, carbs_g, grasa_g)")
      .eq("anio", anio)
      .eq("mes", mesNum),
    admin
      .from("comodines_mes")
      .select("platillo_id, platillos(id, nombre, descripcion, calorias, proteina_g, carbs_g, grasa_g)")
      .eq("anio", anio)
      .eq("mes", mesNum),
    admin.from("platillos").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const menuPorDia = new Map<number, { platilloId: string; platillo: { nombre: string; descripcion: string | null; calorias: number | null; proteina_g: number | null; carbs_g: number | null; grasa_g: number | null } | null }>();
  let publicado = false;
  let publicadoEn: string | null = null;
  for (const f of menuRaw ?? []) {
    if (f.publicado) {
      publicado = true;
      publicadoEn = f.publicado_en;
    }
    if (f.dia_semana) menuPorDia.set(f.dia_semana, { platilloId: f.platillo_id, platillo: f.platillos as unknown as never });
  }

  const comodines = (comodinesRaw ?? [])
    .map((c) => ({ platilloId: c.platillo_id, platillo: c.platillos as unknown as { nombre: string; descripcion: string | null } | null }))
    .filter((c) => c.platillo);

  const nombreMes = MESES[mesNum - 1] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 rounded-pill border border-line bg-surface px-[16px] py-[10px]">
          <a href={`/admin/menu?mes=${mesAnteriorParam}`} className="text-[16px] text-gold">
            ‹
          </a>
          <p className="text-[15px] font-medium text-cream">
            {nombreMes} {anio}
          </p>
          <a href={`/admin/menu?mes=${mesSiguienteParam}`} className="text-[16px] text-gold">
            ›
          </a>
        </div>
        <div className="flex items-start gap-2.5">
          <AccionMenuBoton
            tipo="copiar"
            anio={anio}
            mesNum={mesNum}
            label="Copiar del mes pasado"
            pendingLabel="Copiando…"
            className="btn-secondary rounded-control px-4 py-2.5 text-[13px]"
          />
          <AccionMenuBoton
            tipo="publicar"
            anio={anio}
            mesNum={mesNum}
            label="Publicar menú"
            pendingLabel="Publicando…"
            className="btn-primary rounded-control px-4 py-2.5 text-[13px]"
          />
        </div>
      </div>

      <div
        className={`flex items-center gap-2.5 rounded-card-sm border px-4 py-3 ${
          publicado ? "border-success" : "border-warning"
        }`}
      >
        <span className={`size-1.5 shrink-0 rounded-full ${publicado ? "bg-success" : "bg-warning"}`} />
        <p className="text-[13px] text-cream">
          {publicado
            ? `Menú publicado${publicadoEn ? ` el ${fechaLarga.format(new Date(publicadoEn))}` : ""}. Los clientes ya pueden asignar sus créditos a fechas de ${nombreMes.toLowerCase()}.`
            : `Menú sin publicar todavía. Los clientes no ven este menú hasta que lo publiques.`}
        </p>
      </div>

      <NuevoPlatilloInline />

      <p className="text-[18px] font-medium text-cream">Platillo fijo por día</p>
      <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {DIAS_SEMANA_LARGO.map((nombreDia, i) => {
          const diaNum = i + 1;
          const actual = menuPorDia.get(diaNum);
          return (
            <div key={nombreDia} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3.5">
              <p className="text-[9px] font-medium tracking-[0.72px] text-gold">{nombreDia}</p>
              {actual?.platillo ? (
                <>
                  <p className="text-[15px] font-medium text-cream">{actual.platillo.nombre}</p>
                  {actual.platillo.descripcion && (
                    <p className="text-[12px] leading-[18px] text-muted">{actual.platillo.descripcion}</p>
                  )}
                  {actual.platillo.calorias != null && (
                    <div className="flex justify-between border-t border-line pt-2 text-center text-[11px] text-cream">
                      <span>{actual.platillo.calorias}kcal</span>
                      <span>{actual.platillo.proteina_g}g prot</span>
                      <span>{actual.platillo.carbs_g}g carb</span>
                      <span>{actual.platillo.grasa_g}g grasa</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[13px] italic text-muted">Sin platillo asignado</p>
              )}
              <DiaMenuForm
                anio={anio}
                mesNum={mesNum}
                diaNum={diaNum}
                platillos={platillos ?? []}
                defaultPlatilloId={actual?.platilloId ?? ""}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[18px] font-medium text-cream">Comodines del mes</p>
        <p className="text-[13px] text-muted">Disponibles en lugar del platillo fijo cualquier día</p>
      </div>
      <div className="grid w-full grid-cols-1 gap-3.5 lg:grid-cols-2">
        {comodines.map((c) => (
          <div key={c.platilloId} className="flex items-center justify-between gap-4 rounded-card border-[1.5px] border-gold bg-raised p-4">
            <div className="flex flex-col gap-1">
              <p className="text-[9px] font-medium tracking-[0.72px] text-gold">COMODÍN</p>
              <p className="text-[15px] font-medium text-cream">{c.platillo?.nombre}</p>
              {c.platillo?.descripcion && <p className="text-[12px] text-muted">{c.platillo.descripcion}</p>}
            </div>
            <ComodinQuitarBoton anio={anio} mesNum={mesNum} platilloId={c.platilloId} />
          </div>
        ))}
        {comodines.length === 0 && (
          <p className="text-[13px] text-muted">Todavía no hay comodines configurados para {nombreMes.toLowerCase()}.</p>
        )}
      </div>
      <ComodinAgregarForm
        anio={anio}
        mesNum={mesNum}
        platillos={(platillos ?? []).filter((p) => !comodines.some((c) => c.platilloId === p.id))}
      />
    </div>
  );
}
