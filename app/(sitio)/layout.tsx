/**
 * `(sitio)` agrupa Landing v2 y el flujo de compra 01-05. Cada uno
 * trae su propio header (Nav completo en landing, Nav simple +
 * Stepper en 01-04, Nav simple + saldo en 05) así que este layout
 * no impone chrome compartido.
 *
 * Por decisión explícita del usuario (2026-08-13): ya no se limita a
 * 1440px fijos. Las secciones (Hero, Cómo funciona, Paquetes, Menú
 * semanal, Preguntas, Footer) ya están armadas con `grid`/`flex` +
 * `w-full` así que se reparten solas para llenar cualquier ancho de
 * pantalla sin dejar franjas vacías — no hace falta un contenedor
 * aquí. Antes había `mx-auto max-w-[1440px]`, que topaba el contenido
 * y dejaba fondo muerto en monitores anchos.
 */
export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
