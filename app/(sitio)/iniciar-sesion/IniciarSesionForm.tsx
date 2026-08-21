"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Field, PasswordField } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { formatoCorreoValido } from "@/lib/validacion";
import { iniciarSesion, type IniciarSesionState } from "./actions";

/**
 * Ancho ampliado 2026-08-20 (480px -> 600px) y contenedores de campo
 * corregidos a `w-full` (ver `Field.tsx`) — antes los cuadros de
 * texto se veían más angostos que el botón de abajo.
 *
 * Agregado el mismo día: contraseña con mostrar/ocultar
 * (`PasswordField`), validación de formato de correo antes de
 * mandar el formulario (mensaje inline, no se llega a llamar al
 * servidor con un correo obviamente mal escrito), y link a
 * "¿Olvidaste tu contraseña?".
 */
export function IniciarSesionForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<IniciarSesionState, FormData>(iniciarSesion, {});
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

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex w-full max-w-[600px] flex-col items-start gap-5">
      <input type="hidden" name="next" value={next} />
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        required
        error={errorCorreo}
        onChange={() => errorCorreo && setErrorCorreo(undefined)}
      />
      <PasswordField label="Contraseña" name="password" required />
      <Link href="/recuperar-contrasena" className="-mt-2 text-[13px] text-muted hover:text-cream">
        ¿Olvidaste tu contraseña?
      </Link>
      {state.error && <p className="text-[14px] text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full py-[15px] text-[16px]">
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
