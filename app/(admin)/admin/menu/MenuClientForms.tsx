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
} from "../../actions";

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
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-control py-3 text-[14px] disabled:opacity-40">
        {pending ? "Creando…" : "Crear platillo"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </form>
  );
}

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
