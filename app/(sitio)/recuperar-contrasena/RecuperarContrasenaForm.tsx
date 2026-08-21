"use client";

import { useActionState, useState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { formatoCorreoValido } from "@/lib/validacion";
import { solicitarRecuperacion, type RecuperarContrasenaState } from "./actions";

export function RecuperarContrasenaForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<RecuperarContrasenaState, FormData>(solicitarRecuperacion, {});
  const [errorCorreo, setErrorCorreo] = useState<string | undefined>(undefined);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    if (!formatoCorreoValido(email)) {
      e.preventDefault();
      setErrorCorreo("Ese correo no tiene un formato válido.");
    } else {
      setErrorCorreo(undefined);
    }
  }

  if (state.enviado) {
    return (
      <div className="w-full max-w-[480px] rounded-card-sm border border-success bg-success/10 px-5 py-4 text-center text-[14px] text-cream">
        Si existe una cuenta con ese correo, te acabamos de mandar un link para elegir una contraseña nueva.
        Revisa tu bandeja (y spam, por si acaso).
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex w-full max-w-[480px] flex-col items-start gap-5">
      <input type="hidden" name="next" value={next} />
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        required
        error={errorCorreo}
        onChange={() => errorCorreo && setErrorCorreo(undefined)}
      />
      {state.error && <p className="text-[14px] text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full py-[15px] text-[16px]">
        {pending ? "Enviando…" : "Enviar link de recuperación"}
      </Button>
    </form>
  );
}
