"use client";

import { useActionState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { iniciarSesionStaff, type AdminLoginState } from "./actions";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState<AdminLoginState, FormData>(iniciarSesionStaff, {});

  return (
    <form action={formAction} className="flex w-full max-w-[400px] flex-col items-start gap-5">
      <Field label="Correo electrónico" name="email" type="email" required />
      <Field label="Contraseña" name="password" type="password" required />
      {state.error && <p className="text-[14px] text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full py-[15px] text-[16px]">
        {pending ? "Entrando…" : "Entrar al panel"}
      </Button>
    </form>
  );
}
