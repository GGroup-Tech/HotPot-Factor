import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primario" | "secundario";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Botón — DS node 124:125-130.
 * Primario: bg gold, texto ink. Secundario: borde line, texto cream.
 * Deshabilitado (via prop `disabled`): bg surface, borde #3A322A, texto #3A322A.
 */
export function Button({ variant = "primario", className, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center rounded-control px-[26px] py-[14px] text-[15px] font-medium font-body transition-colors",
        disabled &&
          "bg-surface border border-disabled text-disabled cursor-not-allowed",
        !disabled &&
          variant === "primario" &&
          "bg-gold text-ink hover:bg-gold/90",
        !disabled &&
          variant === "secundario" &&
          "border border-line text-cream hover:border-gold/60",
        className,
      )}
      {...props}
    />
  );
}
