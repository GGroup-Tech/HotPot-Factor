"use client";

import { useActionState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { iniciarSesion, type IniciarSesionState } from "./actions";

/**
 * Ancho ampliado 2026-08-20 (480px -> 600px) a pedido del usuario —
 * los campos se veían chicos en pantallas grandes. `Field` ya es
 * `w-full` internamente, así que basta con ensanchar el contenedor
 * del formulario; no se tocó el componente `Field` compartido para no
 * afectar el resto de formularios del proyecto que lo usan.
 */
export function IniciarSesionForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<IniciarSesionState, FormData>(iniciarSesion, {});

  return (
    <form action={formAction} className="flex w-full max-w-[600px] flex-col items-start gap-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Correo electrónico" name="email" type="email" required />
      <Field label="Contraseña" name="password" type="password" required />
      {state.error && <p className="text-[14px] text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full py-[15px] text-[16px]">
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
