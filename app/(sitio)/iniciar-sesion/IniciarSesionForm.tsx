"use client";

import { useActionState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { iniciarSesion, type IniciarSesionState } from "./actions";

export function IniciarSesionForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<IniciarSesionState, FormData>(iniciarSesion, {});

  return (
    <form action={formAction} className="flex w-[400px] flex-col items-start gap-5">
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
