import { clsx } from "clsx";

/** Píldora — DS node 124:136-138: bg raised, borde gold, dot + texto. */
export function Pill({ children, className, dotClassName }: { children: React.ReactNode; className?: string; dotClassName?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-pill border border-gold bg-raised px-[15px] py-[9px] text-[14px] font-medium text-cream",
        className,
      )}
    >
      <span className={clsx("size-[6px] rounded-full bg-gold", dotClassName)} />
      {children}
    </span>
  );
}
