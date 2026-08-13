"use client";

/** Genera y descarga un CSV en el navegador a partir de filas ya armadas en el server — sin ruta nueva. */
export function ExportarCsvButton({
  filas,
  nombreArchivo,
  className,
  children,
}: {
  filas: string[][];
  nombreArchivo: string;
  className?: string;
  children: React.ReactNode;
}) {
  function exportar() {
    const csv = filas.map((fila) => fila.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={exportar} className={className}>
      {children}
    </button>
  );
}
