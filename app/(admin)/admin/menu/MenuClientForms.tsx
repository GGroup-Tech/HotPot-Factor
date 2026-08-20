"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarMenuDia,
  agregarComodinMes,
  quitarComodinMes,
  copiarMenuMesPasado,
  publicarMenu,
  crearPlatillo,
  generarMenuOptimo,
} from "../../actions";

/**
 * Versión cliente de los controles de Menú del mes. Antes estos eran
 * `<form action={async () => { "use server"; ... }}>` inline dentro de
 * la página (Server Component) — el usuario reportó 2026-08-13 que
 * clickear Guardar/Agregar "no hacía nada en absoluto": ni carga, ni
 * cambio, ni error. Con ese patrón, cualquier falla (de auth, de red,
 * de origen/CSRF de Server Actions detrás de un dominio de Vercel, lo
 * que sea) es invisible — no había ningún manejo de error del lado
 * del cliente.
 *
 * Este archivo mueve la interacción a componentes cliente con
 * `useTransition`, el mismo patrón ya probado y funcionando en
 * `app/components/calendario/DiaCelda.tsx`: ahora cualquier error se
 * muestra en pantalla en vez de fallar en silencio, y hay un estado
 * de "Guardando…" visible mientras se procesa.
 *
 * `GenerarMenuBoton` agregado 2026-08-19 (backlog #62) — dispara el
 * algoritmo de menú óptimo para el mes actual, con
 * `router.refresh()` explícito porque, a diferencia de los demás
 * botones de esta pantalla, este puede reescribir MUCHAS filas de una
 * sola vez (menú fijo completo + todos los comodines) y conviene
 * confirmar visualmente que sí se refrescó todo, no solo un campo.
 */

type Platillo = { id: string; nombre: string };

export function DiaMenuForm({
  anio,
  mesNum,
  diaNum,
  platillos,
  defaultPlatilloId,
}: {
  anio: number;
  mesNum: number;
  diaNum: number;
  platillos: Platillo[];
  defaultPlatilloId: string;
}) {
  const [platilloId, setPlatilloId] = useState(defaultPlatilloId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platilloId) return;
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const res = await actualizarMenuDia(anio, mesNum, diaNum, platilloId);
      if (!res.ok) setError(res.error ?? "No se pudo guardar.");
      else setGuardado(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <select
          value={platilloId}
          onChange={(e) => {
            setPlatilloId(e.target.value);
            setGuardado(false);
          }}
          className="w-full rounded-control border border-line bg-ink px-2 py-1.5 text-[12px] text-cream"
        >
          <option value="" disabled>
            Elegir platillo…
          </option>
          {platillos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !platilloId}
          className="shrink-0 rounded-control border border-line px-2.5 py-1.5 text-[11px] text-cream hover:border-gold/50 disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && <p className="text-[11px] text-danger">{error}</p>}
      {guardado && !error && <p className="text-[11px] text-success">Guardado.</p>}
    </form>
  );
}

export function ComodinAgregarForm({
  anio,
  mesNum,
  platillos,
}: {
  anio: number;
  mesNum: number;
  platillos: Platillo[];
}) {
  const [platilloId, setPlatilloId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platilloId) return;
    setError(null);
    startTransition(async () => {
      const res = await agregarComodinMes(anio, mesNum, platilloId);
      if (!res.ok) setError(res.error ?? "No se pudo agregar.");
      else setPlatilloId("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      <div className="flex max-w-[420px] gap-2">
        <select
          value={platilloId}
          onChange={(e) => setPlatilloId(e.target.value)}
          className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-[13px] text-cream"
        >
          <option value="" disabled>
            Agregar comodín…
          </option>
          {platillos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !platilloId}
          className="btn-secondary shrink-0 rounded-control px-4 py-2.5 text-[13px] disabled:opacity-40"
        >
          {pending ? "Agregando…" : "Agregar"}
        </button>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

export function ComodinQuitarBoton({
  anio,
  mesNum,
  platilloId,
}: {
  anio: number;
  mesNum: number;
  platilloId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await quitarComodinMes(anio, mesNum, platilloId);
            if (!res.ok) setError(res.error ?? "No se pudo quitar.");
          })
        }
        className="shrink-0 rounded-control border border-line px-3 py-2 text-[12px] text-cream hover:border-danger/60 disabled:opacity-40"
      >
        {pending ? "Quitando…" : "Quitar"}
      </button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * Atajo "+ Nuevo platillo" dentro de Menú del mes — el usuario pidió
 * poder dar de alta un platillo sin salir de esta pantalla en vez de
 * navegar a /admin/platillos/nuevo. Al crear con éxito hace
 * `router.refresh()` para que el nuevo platillo aparezca de inmediato
 * en los selects de días y comodines (esos datos vienen del server
 * component `page.tsx`, así que hay que refrescarlo).
 */
export function NuevoPlatilloInline() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await crearPlatillo(formData);
      if (!res.ok) {
        setError(res.error ?? "No se pudo crear el platillo.");
      } else {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn-secondary w-fit rounded-control px-4 py-2.5 text-[13px]"
      >
        + Nuevo platillo
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[700px] flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium text-cream">Nuevo platillo</p>
        <button type="button" onClick={() => setAbierto(false)} className="text-[12px] text-muted hover:text-cream">
          Cancelar
        </button>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-medium text-muted">Nombre</span>
        <input name="nombre" required placeholder="Pollo a la plancha con arroz" className="input" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-medium text-muted">Descripción (opcional)</span>
        <input name="descripcion" placeholder="Pechuga a la plancha, arroz integral y verduras salteadas" className="input" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-medium text-muted">Foto (opcional, PNG o JPEG)</span>
        <input name="foto" type="file" accept="image/png,image/jpeg" className="input" />
      </label>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-muted">Calorías</span>
          <input name="calorias" type="number" min="0" placeholder="450" className="input" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-muted">Proteína (g)</span>
          <input name="proteina_g" type="number" min="0" placeholder="35" className="input" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-muted">Carbs (g)</span>
          <input name="carbs_g" type="number" min="0" placeholder="40" className="input" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-muted">Grasa (g)</span>
          <input name="grasa_g" type="number" min="0" placeholder="12" className="input" />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-muted">Grasa saturada (g)</span>
          <input name="grasa_saturada_g" type="number" min="0" placeholder="4" className="input" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-muted">Fibra (g)</span>
          <input name="fibra_g" type="number" min="0" placeholder="5" className="input" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-muted">Sodio (mg)</span>
          <input name="sodio_mg" type="number" min="0" placeholder="800" className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-medium text-muted">Alérgenos (opcional)</span>
        <input name="alergenos" placeholder="Contiene: trigo (gluten), huevo" className="input" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-medium text-muted">Costo de producción por porción (MXN, opcional)</span>
        <input name="costo_mxn" type="number" min="0" step="0.01" placeholder="65.00" className="input" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-control py-3 text-[14px] disabled:opacity-40">
        {pending ? "Creando…" : "Crear platillo"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

/** Botones de página completa: "Copiar del mes pasado" y "Publicar menú". */
export function AccionMenuBoton({
  tipo,
  anio,
  mesNum,
  label,
  pendingLabel,
  className,
}: {
  tipo: "copiar" | "publicar";
  anio: number;
  mesNum: number;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = tipo === "copiar" ? await copiarMenuMesPasado(anio, mesNum) : await publicarMenu(anio, mesNum);
            if (!res.ok) setError(res.error ?? "Ocurrió un error.");
          })
        }
        className={`${className} disabled:opacity-40`}
      >
        {pending ? pendingLabel : label}
      </button>
      {error && <p className="max-w-[220px] text-right text-[11px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * "Generar automáticamente" — corre el algoritmo de menú óptimo
 * (backlog #62) para este anio/mes: arma los 5 días del menú fijo y
 * la cantidad de comodines que el staff indique, sin repetir ningún
 * platillo hasta agotar el catálogo y minimizando traslape de
 * ingredientes. Solo PROPONE — no publica; el staff revisa el
 * resultado en esta misma pantalla (ya renderizado con lo generado) y
 * le da "Publicar menú" cuando esté conforme, o ajusta un día a mano
 * con el selector normal.
 */
export function GenerarMenuBoton({ anio, mesNum }: { anio: number; mesNum: number }) {
  const router = useRouter();
  const [numComodines, setNumComodines] = useState(5);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onGenerar() {
    setError(null);
    startTransition(async () => {
      const res = await generarMenuOptimo(anio, mesNum, numComodines);
      if (!res.ok) setError(res.error ?? "No se pudo generar el menú.");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          Comodines
          <input
            type="number"
            min={0}
            max={50}
            value={numComodines}
            onChange={(e) => setNumComodines(Math.max(0, Number(e.target.value)))}
            className="w-[56px] rounded-control border border-line bg-ink px-2 py-1.5 text-[12px] text-cream"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={onGenerar}
          className="btn-secondary rounded-control px-4 py-2.5 text-[13px] disabled:opacity-40"
        >
          {pending ? "Generando…" : "Generar automáticamente"}
        </button>
      </div>
      {error && <p className="max-w-[280px] text-right text-[11px] text-danger">{error}</p>}
    </div>
  );
}
