"use client";

import { useState, useTransition } from "react";
import {
  actualizarMenuDia,
  agregarComodinMes,
  quitarComodinMes,
  copiarMenuMesPasado,
  publicarMenu,
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
