"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { cerrarSesionStaff } from "@/app/(admin)/actions";

const fechaLarga = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Mismo mapeo ruta -> título que AdminSidebar usa para el estado
// activo — así el topbar ("Panel", "Pedidos"...) siempre coincide con
// el link resaltado en el sidebar sin tener que pasarlo como prop
// desde cada página.
const TITULOS: { href: string; titulo: string; exact: boolean }[] = [
  { href: "/admin", titulo: "Panel", exact: true },
  { href: "/admin/pedidos", titulo: "Pedidos", exact: false },
  { href: "/admin/clientes", titulo: "Clientes", exact: false },
  { href: "/admin/menu", titulo: "Menú del mes", exact: false },
  { href: "/admin/platillos", titulo: "Platillos", exact: false },
  { href: "/admin/produccion", titulo: "Producción", exact: false },
  { href: "/admin/reparto", titulo: "Reparto", exact: false },
  { href: "/admin/finanzas", titulo: "Finanzas", exact: false },
  { href: "/admin/cupones", titulo: "Cupones", exact: false },
];

function tituloDeRuta(pathname: string): string {
  const match = TITULOS.find((t) => (t.exact ? pathname === t.href : pathname.startsWith(t.href)));
  return match?.titulo ?? "Panel";
}

/**
 * Chrome compartido del panel admin — Figma node 183:3 + 183:32 (A0:
 * Sidebar + Topbar). El título del topbar se deriva de la ruta actual
 * en vez de recibirse como prop, para no tener que enhebrarlo desde
 * `(admin)/layout.tsx` hasta cada página. La fecha siempre es "hoy" —
 * en el diseño original es solo contexto, no un dato de la página.
 */
export function AdminChrome({
  nombreStaff,
  children,
}: {
  nombreStaff: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const titulo = tituloDeRuta(pathname);
  const hoy = new Date();
  const fechaCapitalizada = fechaLarga.format(hoy).replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="flex h-screen bg-ink">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex shrink-0 items-center justify-between border-b border-line bg-ink px-8 py-5">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[24px] font-semibold text-cream">{titulo}</h1>
            <p className="text-[13px] text-muted">{fechaCapitalizada}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-[13px] text-muted sm:block">{nombreStaff}</p>
            <form action={cerrarSesionStaff}>
              <button type="submit" className="text-[13px] text-muted hover:text-cream">
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-8 py-[26px]">{children}</main>
      </div>
    </div>
  );
}
