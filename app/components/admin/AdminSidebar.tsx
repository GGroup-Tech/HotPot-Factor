"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const LINKS = [
  { href: "/admin", label: "Panel", exact: true },
  { href: "/admin/pedidos", label: "Pedidos", exact: false },
  { href: "/admin/clientes", label: "Clientes", exact: false },
  { href: "/admin/menu", label: "Menú del mes", exact: false },
  { href: "/admin/platillos", label: "Platillos", exact: false },
  { href: "/admin/produccion", label: "Producción", exact: false },
  { href: "/admin/reparto", label: "Reparto", exact: false },
  { href: "/admin/cobertura", label: "Cobertura", exact: false },
  { href: "/admin/finanzas", label: "Finanzas", exact: false },
  { href: "/admin/cupones", label: "Cupones", exact: false },
];

/**
 * Sidebar del panel admin — Figma node 183:3 (A0). A diferencia de
 * ClienteSidebar (que colapsa a tabs horizontales en móvil), el panel
 * admin se diseñó desktop-first en Figma; se mantiene como columna
 * fija en todos los tamaños por ahora — la pasada de responsive del
 * panel admin queda para cuando se construyan las pantallas móviles
 * (Fase 4) o si el cliente pide usarlo desde tablet/celular antes.
 *
 * "Cobertura" agregado 2026-08-19 — editor de mapa para los polígonos
 * de zona de cobertura (backlog #55, Fase 1).
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-[238px] shrink-0 flex-col gap-[6px] overflow-y-auto border-r border-line bg-surface px-[18px] py-6">
      <div className="flex flex-col gap-1 overflow-clip py-1 pb-[22px] pl-3">
        <p className="font-display text-[20px] font-semibold text-gold">HOTPOT FACTOR</p>
        <p className="text-[9px] font-medium tracking-[0.9px] text-muted">ADMINISTRACIÓN</p>
      </div>
      {LINKS.map((link) => {
        const activo = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "flex w-full items-center gap-[11px] rounded-control px-3 py-[11px] text-[14px] transition-colors",
              activo ? "border border-line bg-raised font-medium text-cream" : "text-muted hover:bg-raised/60 hover:text-cream",
            )}
          >
            <span className={clsx("size-[6px] shrink-0 rounded-full", activo ? "bg-gold" : "bg-muted/50")} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
