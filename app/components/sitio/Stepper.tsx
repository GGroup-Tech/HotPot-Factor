import { clsx } from "clsx";

const PASOS = ["Paquete", "Cuenta", "Pago", "Tu menú"] as const;

/** Stepper del flujo de compra — Figma nodes 104:8, 105:7, 106:7, 108:11. */
export function Stepper({ activo }: { activo: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-[10px] bg-surface px-6 md:px-10 lg:px-[100px] py-[26px]">
      {PASOS.map((label, i) => {
        const paso = i + 1;
        const completadoOActivo = paso <= activo;
        return (
          <div key={label} className="flex items-center gap-[10px]">
            {i > 0 && <span className="h-px w-[60px] bg-line" />}
            <div className="flex items-center gap-[10px]">
              <span
                className={clsx(
                  "flex size-[26px] items-center justify-center rounded-pill text-[13px] font-medium",
                  completadoOActivo ? "bg-gold text-ink" : "border border-line bg-[#1f1815] text-muted",
                )}
              >
                {paso}
              </span>
              <span className={clsx("text-[15px]", completadoOActivo ? "font-medium text-cream" : "text-muted")}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
