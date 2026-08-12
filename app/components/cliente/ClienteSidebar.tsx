"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const LINKS = [
  { href: "/cuenta", label: "Resumen", exact: true },
  { href: "/cuenta/calendario", label: "Mi calendario", exact: false },
  { href: "/cuenta/entregas", label: "Próximas entregas", exact: false },
  { href: "/cuenta/creditos", label: "Mis créditos", exact: false },
  { href: "/cuenta/compras", label: "Mis compras", exact: false },
  { href: "/cuenta/perfil", label: "Mi perfil", exact: false },
];

/**
 * Nav del área cliente — barra horizontal con scroll en móvil/tablet,
 * columna fija en desktop (lg+). `usePathname` resalta el link activo;
 * "Mi calendario" es una ruta propia del panel (/cuenta/calendario),
 * independiente de /arma-tu-mes (esa es la pantalla 04 del flujo de
 * compra, con su propio chrome). Ambas comparten la misma lógica vía
 * lib/calendario.ts, pero no son la misma pantalla.
 */
export function ClienteSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full gap-2 overflow-x-auto pb-2 lg:w-[220px] lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
      {LINKS.map((link) => {
        const activo = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "shrink-0 whitespace-nowrap rounded-control px-4 py-[10px] text-[14px] font-medium transition-colors lg:shrink lg:whitespace-normal",
              activo ? "bg-raised text-cream" : "text-muted hover:bg-raised/60 hover:text-cream",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
