import { clsx } from "clsx";

/** Tarjeta — DS node 124:141-144: eyebrow gold + título Fraunces + texto de apoyo. */
export function Card({
  eyebrow,
  title,
  support,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  support?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-start gap-[10px] rounded-card border border-line bg-surface px-6 py-[22px]", className)}>
      {eyebrow && (
        <p className="text-[10px] font-medium uppercase tracking-[1px] text-gold">{eyebrow}</p>
      )}
      {title && <h3 className="font-display text-[24px] font-semibold text-cream">{title}</h3>}
      {support && <p className="text-[13px] text-muted">{support}</p>}
      {children}
    </div>
  );
}

/** Alerta — banner de estado (info/success/warning/danger) usado en formularios y admin. */
export function Alerta({
  tono = "info",
  children,
}: {
  tono?: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    info: "border-gold/40 bg-gold/10 text-cream",
    success: "border-success/40 bg-success/10 text-success",
    warning: "border-warning/40 bg-warning/10 text-warning",
    danger: "border-danger/40 bg-danger/10 text-danger",
  };
  return (
    <div className={clsx("w-full rounded-card border px-5 py-[14px] text-[14px]", tones[tono])}>
      {children}
    </div>
  );
}
