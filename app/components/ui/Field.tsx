import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Campo — DS node 124:132-135: label muted 13px + input surface/line. */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, className, id, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col items-start gap-[9px]">
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

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function SelectField({ label, error, className, id, children, ...props }: SelectFieldProps) {
  const selectId = id ?? props.name;
  return (
    <div className="flex flex-col items-start gap-[9px]">
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
    <div className="flex flex-col items-start gap-[9px]">
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
