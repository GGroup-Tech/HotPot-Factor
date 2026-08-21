"use client";

import { useActionState, useState } from "react";
import { PasswordField } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { restablecerContrasena, type RestablecerContrasenaState } from "./actions";

export function RestablecerContrasenaForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<RestablecerContrasenaState, FormData>(
    restablecerContrasena,
    {},
  );
  const [errorLocal, setErrorLocal] = useState<string | undefined>(undefined);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmar = String(data.get("confirmar") ?? "");
    if (password.length < 8) {
      e.preventDefault();
      setErrorLocal("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      e.preventDefault();
      setErrorLocal("Las dos contraseñas no coinciden.");
      return;
    }
    setErrorLocal(undefined);
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex w-full max-w-[480px] flex-col items-start gap-5">
      <input type="hidden" name="next" value={next} />
      <PasswordField label="Nueva contraseña" name="password" placeholder="••••••••" required minLength={8} />
      <PasswordField label="Confirmar contraseña" name="confirmar" placeholder="••••••••" required minLength={8} />
      {(errorLocal || state.error) && <p className="text-[14px] text-danger">{errorLocal ?? state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full py-[15px] text-[16px]">
        {pending ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
