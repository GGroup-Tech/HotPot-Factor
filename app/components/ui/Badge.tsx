import { clsx } from "clsx";
import type { PedidoEstado } from "@/types/database";

/** Etiqueta — DS node 124:139-140: bg gold, texto ink 9px, tracking 0.72px, uppercase. */
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-badge bg-gold px-[9px] py-[4px] text-[9px] font-medium uppercase tracking-[0.72px] text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

const ESTADO_STYLES: Record<PedidoEstado, { label: string; className: string }> = {
  programado: { label: "Programado", className: "bg-raised text-cream border border-line" },
  en_produccion: { label: "En producción", className: "bg-warning/20 text-warning border border-warning/40" },
  entregado: { label: "Entregado", className: "bg-success/20 text-success border border-success/40" },
  cancelado: { label: "Cancelado", className: "bg-danger/20 text-danger border border-danger/40" },
};

/** Badge de estado de pedido — clicable en el admin para avanzar el flujo. */
export function EstadoPedidoBadge({
  estado,
  onClick,
}: {
  estado: PedidoEstado;
  onClick?: () => void;
}) {
  const { label, className } = ESTADO_STYLES[estado];
  const Component = onClick ? "button" : "span";
  return (
    <Component
      onClick={onClick}
      className={clsx(
        "inline-flex items-center rounded-badge px-[9px] py-[4px] text-[11px] font-medium",
        onClick && "cursor-pointer hover:opacity-80",
        className,
      )}
    >
      {label}
    </Component>
  );
}
