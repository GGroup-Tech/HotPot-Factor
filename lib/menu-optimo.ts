/**
 * Algoritmo de menú semanal óptimo (backlog #62, 2026-08-19). Decide
 * qué platillos van en el menú fijo (5, uno por día lun-vie) y en la
 * lista de comodines de un mes, con dos reglas, en este orden de
 * prioridad:
 *
 *   1. No repetir un platillo hasta agotar TODO el catálogo activo
 *      (medido en meses reales, contando tanto usos en el menú fijo
 *      como en comodines — ambos los define el restaurante).
 *   2. Dentro de lo que sí se puede elegir en un momento dado (el
 *      grupo de platillos "empatados" en antigüedad de uso — casi
 *      siempre TODOS los nunca usados, al principio), preferir la
 *      combinación que menos ingredientes repite entre sí, para no
 *      servir puro pollo o pura res seguido.
 *
 * Puro cálculo, sin acceso a base de datos — la acción de servidor
 * (`generarMenuOptimo` en `app/(admin)/actions.ts`) arma los
 * `CandidatoMenu[]` a partir de `platillos`, `platillo_ingredientes`,
 * `menu_mes` y `comodines_mes`, y llama a `generarPropuestaMenu`.
 */

export interface CandidatoMenu {
  id: string;
  nombre: string;
  /** Ingredientes normalizados (minúsculas, sin espacios extra) de este platillo. */
  ingredientes: Set<string>;
  /** anio*12+mes de la última vez que se usó (menú fijo o comodín). `-Infinity` si nunca. */
  ultimoUso: number;
}

/** Similitud de Jaccard entre dos conjuntos de ingredientes — 0 si no comparten nada, 1 si son idénticos. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let interseccion = 0;
  for (const x of a) if (b.has(x)) interseccion++;
  const union = a.size + b.size - interseccion;
  return union === 0 ? 0 : interseccion / union;
}

function solapamientoConSeleccion(candidato: CandidatoMenu, seleccion: CandidatoMenu[]): number {
  let total = 0;
  for (const s of seleccion) total += jaccard(candidato.ingredientes, s.ingredientes);
  return total;
}

/**
 * Elige `totalSlots` platillos de `candidatos` (que se asume son
 * TODOS los platillos activos). Si hay menos candidatos que slots
 * pedidos, regresa todos los que haya (el llamador debe validar esto
 * antes si quiere un error explícito en vez de un menú incompleto).
 */
export function generarPropuestaMenu(candidatos: CandidatoMenu[], totalSlots: number): CandidatoMenu[] {
  const restantes = [...candidatos];
  const seleccion: CandidatoMenu[] = [];
  const n = Math.min(totalSlots, restantes.length);

  for (let i = 0; i < n; i++) {
    // El "pool" de esta ronda: todos los candidatos empatados en la
    // antigüedad de uso más vieja disponible (normalmente, al
    // principio, son TODOS los nunca usados — ahí es donde el
    // criterio de variedad de ingredientes hace todo el trabajo).
    let minRecencia = restantes[0]!.ultimoUso;
    for (const c of restantes) if (c.ultimoUso < minRecencia) minRecencia = c.ultimoUso;
    const pool = restantes.filter((c) => c.ultimoUso === minRecencia);

    let mejor = pool[0]!;
    let mejorScore = solapamientoConSeleccion(mejor, seleccion);
    for (const c of pool.slice(1)) {
      const score = solapamientoConSeleccion(c, seleccion);
      if (score < mejorScore || (score === mejorScore && c.nombre.localeCompare(mejor.nombre) < 0)) {
        mejor = c;
        mejorScore = score;
      }
    }

    seleccion.push(mejor);
    restantes.splice(restantes.indexOf(mejor), 1);
  }

  return seleccion;
}
