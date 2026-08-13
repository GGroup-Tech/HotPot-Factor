"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPlatillo, actualizarPlatillo, alternarPlatilloActivo } from "../../actions";

type PlatilloData = {
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  calorias: number | null;
  proteina_g: number | null;
  carbs_g: number | null;
  grasa_g: number | null;
  activo: boolean;
};

export function CrearPlatilloForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await crearPlatillo(formData);
      if (!res.ok) setError(res.error ?? "No se pudo crear el platillo.");
      else router.push("/admin/platillos");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[700px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <Campo label="Nombre">
        <input name="nombre" required placeholder="Pollo a la plancha con arroz" className="input" />
      </Campo>
      <Campo label="Descripción (opcional)">
        <input name="descripcion" placeholder="Pechuga a la plancha, arroz integral y verduras salteadas" className="input" />
      </Campo>
      <Campo label="Foto (opcional, PNG o JPEG)">
        <input name="foto" type="file" accept="image/png,image/jpeg" className="input" />
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
    </form>
  );
}

export function EditarPlatilloForm({ platillo }: { platillo: PlatilloData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await actualizarPlatillo(platillo.id, formData);
      if (!res.ok) setError(res.error ?? "No se pudo guardar.");
      else router.push("/admin/platillos");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[700px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <Campo label="Nombre">
        <input name="nombre" required defaultValue={platillo.nombre} className="input" />
      </Campo>
      <Campo label="Descripción (opcional)">
        <input name="descripcion" defaultValue={platillo.descripcion ?? ""} className="input" />
      </Campo>
      {platillo.foto_url && (
        <img src={platillo.foto_url} alt={platillo.nombre} className="h-28 w-28 rounded-control object-cover" />
      )}
      <Campo label={platillo.foto_url ? "Reemplazar foto (opcional, PNG o JPEG)" : "Foto (opcional, PNG o JPEG)"}>
        <input name="foto" type="file" accept="image/png,image/jpeg" className="input" />
      </Campo>
      <input type="hidden" name="foto_url_actual" defaultValue={platillo.foto_url ?? ""} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo label="Calorías">
          <input name="calorias" type="number" min="0" defaultValue={platillo.calorias ?? ""} className="input" />
        </Campo>
        <Campo label="Proteína (g)">
          <input name="proteina_g" type="number" min="0" defaultValue={platillo.proteina_g ?? ""} className="input" />
        </Campo>
        <Campo label="Carbs (g)">
          <input name="carbs_g" type="number" min="0" defaultValue={platillo.carbs_g ?? ""} className="input" />
        </Campo>
        <Campo label="Grasa (g)">
          <input name="grasa_g" type="number" min="0" defaultValue={platillo.grasa_g ?? ""} className="input" />
        </Campo>
      </div>
      <label className="flex items-center gap-2.5 text-[14px] text-cream">
        <input type="checkbox" name="activo" defaultChecked={platillo.activo} className="size-[16px]" />
        Activo (visible para asignar en menús/comodines)
      </label>
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-control py-3 text-[14px] disabled:opacity-40">
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
      {error && <p className="text-[12px] text-danger">{error}</p>}
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
