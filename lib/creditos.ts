/**
 * Reglas invariantes de créditos y pedidos. Estas funciones son la
 * ÚNICA fuente de verdad para el corte de edición — no debe existir
 * ninguna ruta, acción de servidor, ni override de admin que salte
 * `puedeEditarPedido`. El texto del brief es explícito: "sin
 * excepciones de código".
 *
 * `COMODINES_POR_MES` / `comodinesDisponibles()` — ELIMINADAS
 * 2026-08-19. Se habían agregado un límite de 2 comodines/mes que
 * nunca existió como regla real del negocio: el usuario confirmó
 * explícitamente "los comodines son ilimitados, no tienen límite
 * para escogerlos". Un comodín solo se limita por lo mismo que
 * cualquier otro día del calendario: tener crédito disponible y que
 * el día siga fuera de las 48h de corte — no hay tope aparte.
 */

export const HORAS_CORTE_EDICION = 48;

/**
 * Un pedido se puede editar/cancelar solo si faltan más de 48h para
 * la fecha de entrega, evaluado en el momento de la llamada (no al
 * momento de crear el pedido).
 */
export function puedeEditarPedido(fechaEntrega: Date, ahora: Date = new Date()): boolean {
  const msRestantes = fechaEntrega.getTime() - ahora.getTime();
  const horasRestantes = msRestantes / (1000 * 60 * 60);
  return horasRestantes > HORAS_CORTE_EDICION;
}

/**
 * El saldo de créditos SIEMPRE se deriva de `credito_movimientos`
 * (o de la vista `saldo_creditos`, que hace el mismo SUM). Nunca
 * existe un contador cacheado — este helper solo documenta/valida esa
 * regla para código que ya trae los movimientos en memoria (p.ej.
 * para mostrar un desglose optimista en el cliente antes de refetch).
 */
export function calcularSaldo(movimientos: { cantidad: number }[]): number {
  return movimientos.reduce((acc, m) => acc + m.cantidad, 0);
}

/** El menú del mes N se publica el día 20 del mes N-1. */
export function fechaPublicacionMenu(mes: Date): Date {
  const mesAnterior = new Date(mes.getFullYear(), mes.getMonth() - 1, 20);
  return mesAnterior;
}

export function menuEstaPublicado(publicado: boolean): boolean {
  // La bandera `menu_mes.publicado` es la fuente de verdad operativa;
  // `fechaPublicacionMenu` sirve para mostrar countdowns en UI, no
  // para decidir acceso — evita drift de reloj entre cliente/servidor.
  return publicado;
}
