"use client";

import { useActionState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { actualizarPerfil, type ActualizarPerfilState } from "../actions";

interface UsuarioPerfil {
  nombre: string;
  email: string;
  telefono: string | null;
  colonia: string | null;
  direccion: string | null;
}

export function PerfilForm({ usuario }: { usuario: UsuarioPerfil }) {
  const [state, formAction, pending] = useActionState<ActualizarPerfilState, FormData>(actualizarPerfil, {});

  return (
    <form action={formAction} className="flex w-full max-w-[560px] flex-col gap-5">
      <Field label="Correo electrónico" name="email_display" defaultValue={usuario.email} disabled />
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <Field label="Nombre" name="nombre" defaultValue={usuario.nombre} required />
        <Field label="Teléfono" name="telefono" defaultValue={usuario.telefono ?? ""} />
      </div>
      <Field label="Colonia" name="colonia" defaultValue={usuario.colonia ?? ""} />
      <Field label="Dirección" name="direccion" defaultValue={usuario.direccion ?? ""} />

      {state.error && <p className="text-[14px] text-danger">{state.error}</p>}
      {state.ok && <p className="text-[14px] text-success">Guardado.</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
