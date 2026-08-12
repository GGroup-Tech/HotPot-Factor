/**
 * Lógica de cobertura por colonia compartida entre el endpoint en vivo
 * (`/api/cobertura`, usado mientras el usuario escribe) y la validación
 * real al enviar el formulario (`crear-cuenta/actions.ts`).
 */

/** minúsculas + sin acentos, para comparar "López Mateos" con "lopez mateos". */
export function normalizarColonia(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * true si `colonia` hace match (en cualquier dirección, insensible a
 * acentos/mayúsculas) contra alguna de las `zonas` activas.
 */
export function hayCobertura(colonia: string, zonas: string[]): boolean {
  const entrada = normalizarColonia(colonia);
  if (!entrada) return false;
  return zonas.some((zonaColonia) => {
    const zona = normalizarColonia(zonaColonia);
    return zona.length > 0 && (entrada.includes(zona) || zona.includes(entrada));
  });
}
