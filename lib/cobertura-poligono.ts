/**
 * Cobertura por polígono geográfico — complementa (no reemplaza) el
 * match por nombre de colonia en `lib/cobertura.ts`. Ese sigue siendo
 * el aviso instantáneo mientras el cliente escribe (sin llamar a
 * Google en cada tecla); el polígono es la decisión real al enviar
 * el formulario completo, una vez que la dirección ya se geocodificó.
 *
 * Ray-casting simple (par/impar) — suficiente a escala de una ciudad,
 * no hace falta geometría geodésica precisa para esto. Sin
 * dependencias nuevas (no se agregó ningún paquete de mapas al
 * proyecto) — el mapa interactivo del editor en el admin usa el
 * script de Google Maps directo, sin wrapper de npm.
 */

export interface PuntoGeo {
  lat: number;
  lng: number;
}

/** true si `punto` cae dentro de `poligono` (lista de vértices, en cualquier orden). */
export function puntoEnPoligono(punto: PuntoGeo, poligono: PuntoGeo[]): boolean {
  if (poligono.length < 3) return false;
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const vi = poligono[i];
    const vj = poligono[j];
    const interseca =
      vi.lat > punto.lat !== vj.lat > punto.lat &&
      punto.lng < ((vj.lng - vi.lng) * (punto.lat - vi.lat)) / (vj.lat - vi.lat) + vi.lng;
    if (interseca) dentro = !dentro;
  }
  return dentro;
}

/** true si `punto` cae dentro de CUALQUIERA de los polígonos activos. */
export function hayCoberturaPorPoligono(punto: PuntoGeo, poligonos: PuntoGeo[][]): boolean {
  return poligonos.some((p) => puntoEnPoligono(punto, p));
}
