"use client";

import { useState, useTransition } from "react";
import { crearPlatillo, alternarPlatilloActivo } from "../../actions";

/**
 * Componentes cliente para el catálogo de platillos — mismo patrón
 * (useTransition + error visible) que `app/(admin)/admin/menu/MenuClientForms.tsx`,
 * para no repetir el problema de botones que fallan en silencio.
 */

export function CrearPlatilloForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [key, setKey] = useState(0); // fuerza re-mount del form para limpiarlo tras crear

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await crearPlatillo(formData);
      if (!res.ok) setError(res.error ?? "No se pudo crear el platillo.");
      else {
        setOk(true);
        setKey((k) => k + 1);
      }
    });
  }

  return (
    <form key={key} onSubmit={onSubmit} className="flex w-full max-w-[700px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <Campo label="Nombre">
        <input name="nombre" required placeholder="Pollo a la plancha con arroz" className="input" />
      </Campo>
      <Campo label="Descripción (opcional)">
        <input name="descripcion" placeholder="Pechuga a la plancha, arroz integral y verduras salteadas" className="input" />
      </Campo>
      <Campo label="URL de foto (opcional)">
        <input name="foto_url" placeholder="https://…" className="input" />
      </Campo>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo label="Calorías">
          <input name="calorias" type="number" min="0" placeholder="450" className="input" />
        </Campo>
        <Campo label="Proteína (g)">
          <input name="proteina_g" type="number" min="0" placeholder="35" className="input" />
        </Campo>
        <Campo label="Carbs (g)">
          <input name="carbs_g" type="number" min="0" placeholder="40" className="input" />
        </Campo>
        <Campo label="Grasa (g)">
          <input name="grasa_g" type="number" min="0" placeholder="12" className="input" />
        </Campo>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-control py-3 text-[14px] disabled:opacity-40">
        {pending ? "Creando…" : "Crear platillo"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {ok && !error && <p className="text-[12px] text-success">Platillo creado.</p>}
    </form>
  );
}

export function PlatilloActivoBoton({ platilloId, activo }: { platilloId: string; activo: boolean }) {
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
            const res = await alternarPlatilloActivo(platilloId, !activo);
            if (!res.ok) setError(res.error ?? "No se pudo actualizar.");
          })
        }
        className="text-[12px] text-muted hover:text-cream disabled:opacity-40"
      >
        {pending ? "…" : activo ? "Desactivar" : "Activar"}
      </button>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
