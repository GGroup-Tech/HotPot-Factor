/**
 * `(sitio)` agrupa Landing v2 y el flujo de compra 01-05. Cada uno
 * trae su propio header (Nav completo en landing, Nav simple +
 * Stepper en 01-04, Nav simple + saldo en 05) así que este layout
 * no impone chrome compartido — solo agrupa rutas y limita el ancho
 * máximo a 1440px (ancho del frame de Figma) para que el contenido
 * no se pegue a la izquierda dejando un vacío a la derecha en
 * monitores anchos; en pantallas angostas se comporta igual que antes.
 */
export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1440px]">{children}</div>;
}
