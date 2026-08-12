/**
 * Placeholder para las secciones del panel admin que todavía no
 * tienen su frame de Figma revisado (Pedidos, Clientes, Menú del mes,
 * Producción, Reparto, Finanzas, Cupones). Cada una se reemplaza por
 * la pantalla real en cuanto se comparta su link de Figma — así el
 * sidebar ya navega a algo en vez de un 404 mientras tanto.
 */
export function EnConstruccion({ seccion }: { seccion: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card-lg border border-line bg-surface p-8">
      <p className="text-[15px] font-medium text-cream">{seccion} — en construcción</p>
      <p className="max-w-[520px] text-[14px] text-muted">
        Esta sección todavía no tiene su diseño de Figma revisado. En cuanto se comparta el link del frame
        correspondiente, se construye igual que el Panel.
      </p>
    </div>
  );
}
