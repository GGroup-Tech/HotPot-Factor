"use client";

/** Botón "Imprimir lista de cocina" — dispara la impresión del navegador. */
export function ImprimirButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
