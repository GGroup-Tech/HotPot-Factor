"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * FAB Sofía — Figma node 244:218. En la landing (sin sesión) Sofía
 * todavía no puede platicar (el endpoint requiere usuario autenticado),
 * así que el FAB muestra un tooltip y lleva a crear cuenta. La versión
 * con chat real vive en el área cliente (`SofiaChat`).
 */
export function SofiaFabGuest() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="card w-[240px] rounded-card p-4 text-[13px] text-cream shadow-lg">
          Crea tu cuenta para platicar con Sofía sobre tus créditos y entregas.
          <Link href="/crear-cuenta" className="mt-2 block text-gold hover:underline">
            Crear cuenta →
          </Link>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Pregúntale a Sofía"
        className="flex size-14 items-center justify-center rounded-full bg-gold text-[24px] font-semibold text-ink font-display shadow-lg transition-transform hover:scale-105"
      >
        S
      </button>
    </div>
  );
}
