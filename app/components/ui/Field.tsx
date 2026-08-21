"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Campo — DS node 124:132-135: label muted 13px + input surface/line.
 *
 * "use client" agregado 2026-08-20 para poder incluir `PasswordField`
 * (necesita `useState` para el toggle de mostrar/ocultar) en el mismo
 * archivo — los 4 lugares que ya importaban `Field`/`SelectField`/
 * `TextareaField` (AdminLoginForm, IniciarSesionForm, CrearCuentaForm,
 * PerfilForm) ya eran todos Client Components, así que este cambio no
 * rompe nada del lado servidor.
 *
 * Bug de simetría corregido el mismo día: el `div` contenedor de cada
 * campo no tenía `w-full`. Dentro de un `<form className="flex
 * flex-col items-start ...">`, `items-start` hace que los hijos NO se
 * estiren al ancho del contenedor por default — el botón de abajo sí
 * tenía `w-full` explícito y por eso se veía más ancho que los
 * cuadros de texto, reportado por el usuario con capturas de los
 * logins. Se agrega `w-full` a los tres contenedores para que
 * siempre midan lo mismo que el resto del formulario.
 */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, className, id, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex w-full flex-col items-start gap-[9px]">
      <label htmlFor={inputId} className="text-label text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={clsx(
          "w-full rounded-control border border-line bg-surface px-4 py-[14px] text-[15px] text-cream placeholder:text-muted/70 focus:outline-none focus:border-gold/70 focus:ring-1 focus:ring-gold/40",
          error && "border-danger focus:border-danger focus:ring-danger/40",
          className,
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * Campo de contraseña con botón de mostrar/ocultar (pedido del
 * usuario 2026-08-20). Mismo look que `Field`, pero controla su
 * propio `type` ("password" / "text") con estado local — por eso no
 * puede ser un simple wrapper de `<input type="password">` estático.
 * El botón de ojo es `type="button"` a propósito, para que nunca
 * dispare el submit del formulario que lo contiene.
 */
interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export function PasswordField({ label, error, className, id, ...props }: PasswordFieldProps) {
  const inputId = id ?? props.name;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex w-full flex-col items-start gap-[9px]">
      <label htmlFor={inputId} className="text-label text-muted">
        {label}
      </label>
      <div className="relative w-full">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={clsx(
            "w-full rounded-control border border-line bg-surface px-4 py-[14px] pr-[52px] text-[15px] text-cream placeholder:text-muted/70 focus:outline-none focus:border-gold/70 focus:ring-1 focus:ring-gold/40",
            error && "border-danger focus:border-danger focus:ring-danger/40",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          tabIndex={-1}
          className="absolute right-0 top-0 flex h-full w-[44px] items-center justify-center text-muted hover:text-cream"
        >
          {visible ? <IconoOjoTachado /> : <IconoOjo />}
        </button>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

function IconoOjo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconoOjoTachado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function SelectField({ label, error, className, id, children, ...props }: SelectFieldProps) {
  const selectId = id ?? props.name;
  return (
    <div className="flex w-full flex-col items-start gap-[9px]">
      <label htmlFor={selectId} className="text-label text-muted">
        {label}
      </label>
      <select
        id={selectId}
        className={clsx(
          "w-full rounded-control border border-line bg-surface px-4 py-[14px] text-[15px] text-cream focus:outline-none focus:border-gold/70 focus:ring-1 focus:ring-gold/40",
          error && "border-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextareaField({ label, error, className, id, ...props }: TextareaFieldProps) {
  const areaId = id ?? props.name;
  return (
    <div className="flex w-full flex-col items-start gap-[9px]">
      <label htmlFor={areaId} className="text-label text-muted">
        {label}
      </label>
      <textarea
        id={areaId}
        className={clsx(
          "w-full rounded-control border border-line bg-surface px-4 py-[14px] text-[15px] text-cream placeholder:text-muted/70 focus:outline-none focus:border-gold/70 focus:ring-1 focus:ring-gold/40",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
