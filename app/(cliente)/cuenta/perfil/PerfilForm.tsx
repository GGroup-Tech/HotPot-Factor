"use client";

import { useActionState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { actualizarPerfil, type ActualizarPerfilState } from "../actions";

interface UsuarioPerfil {
  nombre: string;
  apellido: string;
  telefono: string | null;
  fechaNac: string | null;
  colonia: string | null;
  calleNumero: string | null;
  codigoPostal: string | null;
}

/**
 * Corregido 2026-08-17/18: antes asumía `direccion` (no existe) y un
 * solo campo `nombre` (en realidad `apellido` es columna aparte). El
 * correo YA NO se edita aquí a propósito — cambiar de correo requiere
 * el flujo de Supabase Auth, no un simple UPDATE a `usuarios` (por
 * eso llega como prop `email` separado, de `auth.users`, no de la
 * fila de `usuarios`). Se agrega `fecha_nac` para el registro de edad.
 */
export function PerfilForm({ usuario, email }: { usuario: UsuarioPerfil; email: string }) {
  const [state, formAction, pending] = useActionState<ActualizarPerfilState, FormData>(actualizarPerfil, {});

  return (
    <form action={formAction} className="flex w-full max-w-[560px] flex-col gap-5">
      <Field label="Correo electrónico" name="email_display" defaultValue={email} disabled />
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <Field label="Nombre" name="nombre" defaultValue={usuario.nombre} required />
        <Field label="Apellido" name="apellido" defaultValue={usuario.apellido} required />
      </div>
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <Field label="Teléfono" name="telefono" defaultValue={usuario.telefono ?? ""} />
        <Field label="Fecha de nacimiento" name="fecha_nac" type="date" defaultValue={usuario.fechaNac ?? ""} />
      </div>
      <Field label="Calle y número" name="calle_numero" defaultValue={usuario.calleNumero ?? ""} />
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <Field label="Colonia" name="colonia" defaultValue={usuario.colonia ?? ""} />
        <Field label="Código postal" name="codigo_postal" defaultValue={usuario.codigoPostal ?? ""} />
      </div>

      {state.error && <p className="text-[14px] text-danger">{state.error}</p>}
      {state.ok && <p className="text-[14px] text-success">Guardado.</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
