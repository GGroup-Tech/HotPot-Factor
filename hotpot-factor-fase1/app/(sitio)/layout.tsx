/**
 * `(sitio)` agrupa Landing v2 y el flujo de compra 01-05. Cada uno
 * trae su propio header (Nav completo en landing, Nav simple +
 * Stepper en 01-04, Nav simple + saldo en 05) así que este layout
 * no impone chrome compartido — solo existe para el agrupamiento de
 * rutas.
 */
export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
