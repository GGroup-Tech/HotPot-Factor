/**
 * Fórmulas del módulo de finanzas. Puras y sin dependencias de Supabase
 * a propósito: cada tab (`app/(admin)/admin/finanzas/*`) obtiene sus
 * insumos (montos, conteos) con queries dedicadas y los reduce con
 * estas funciones, así las reglas de negocio quedan en un solo lugar
 * y son unit-testeable sin mockear la base de datos.
 */

export const PRECIO_PROMEDIO_CREDITO_MXN = 139;
export const ISR_RATE = 0.3;

export const DEPRECIACION_MENSUAL = {
  cocina: 125,
  reparto: 133,
  plataforma: 1042,
} as const;

export const DEPRECIACION_MENSUAL_TOTAL =
  DEPRECIACION_MENSUAL.cocina +
  DEPRECIACION_MENSUAL.reparto +
  DEPRECIACION_MENSUAL.plataforma; // 1300

/** Efectivo cobrado = SUM(compras.monto_mxn) del período */
export function efectivoCobrado(montosCompras: number[]): number {
  return montosCompras.reduce((acc, m) => acc + m, 0);
}

/** Ingreso realizado = créditos consumidos × $139 */
export function ingresoRealizado(creditosConsumidos: number): number {
  return creditosConsumidos * PRECIO_PROMEDIO_CREDITO_MXN;
}

/** Créditos diferidos (pasivo) = SUM(saldo_creditos.saldo) × $139 */
export function creditosDiferidos(saldosPorUsuario: number[]): number {
  const totalSaldo = saldosPorUsuario.reduce((acc, s) => acc + s, 0);
  return totalSaldo * PRECIO_PROMEDIO_CREDITO_MXN;
}

/** Utilidad bruta = Ingreso realizado − Costo de producción */
export function utilidadBruta(
  ingresoRealizadoMxn: number,
  costoProduccionMxn: number,
): number {
  return ingresoRealizadoMxn - costoProduccionMxn;
}

/** EBIT = Utilidad bruta − Gastos operativos */
export function ebit(utilidadBrutaMxn: number, gastosOperativosMxn: number): number {
  return utilidadBrutaMxn - gastosOperativosMxn;
}

/** EBITDA = EBIT + Depreciación ($1,300/mes fijo) */
export function ebitda(ebitMxn: number, depreciacionMxn: number = DEPRECIACION_MENSUAL_TOTAL): number {
  return ebitMxn + depreciacionMxn;
}

/** EBT = EBIT − Intereses (0 por ahora) */
export function ebt(ebitMxn: number, interesesMxn = 0): number {
  return ebitMxn - interesesMxn;
}

/** Utilidad neta = EBT − ISR 30% */
export function utilidadNeta(ebtMxn: number, isrRate: number = ISR_RATE): number {
  return ebtMxn - ebtMxn * isrRate;
}

/** Margen neto = Utilidad neta / Efectivo cobrado */
export function margenNeto(utilidadNetaMxn: number, efectivoCobradoMxn: number): number {
  if (efectivoCobradoMxn === 0) return 0;
  return utilidadNetaMxn / efectivoCobradoMxn;
}

export interface PnLInput {
  montosCompras: number[];
  creditosConsumidos: number;
  costoProduccionMxn: number;
  gastosOperativosMxn: number;
  interesesMxn?: number;
  depreciacionMxn?: number;
}

export interface PnLResult {
  efectivoCobrado: number;
  ingresoRealizado: number;
  utilidadBruta: number;
  ebit: number;
  ebitda: number;
  ebt: number;
  utilidadNeta: number;
  margenNeto: number;
}

/** Corre la cascada completa de P&L a partir de los insumos crudos. */
export function calcularPnL(input: PnLInput): PnLResult {
  const efectivo = efectivoCobrado(input.montosCompras);
  const ingreso = ingresoRealizado(input.creditosConsumidos);
  const bruta = utilidadBruta(ingreso, input.costoProduccionMxn);
  const operativo = ebit(bruta, input.gastosOperativosMxn);
  const depreciacion = ebitda(operativo, input.depreciacionMxn);
  const antesImpuestos = ebt(operativo, input.interesesMxn ?? 0);
  const neta = utilidadNeta(antesImpuestos);

  return {
    efectivoCobrado: efectivo,
    ingresoRealizado: ingreso,
    utilidadBruta: bruta,
    ebit: operativo,
    ebitda: depreciacion,
    ebt: antesImpuestos,
    utilidadNeta: neta,
    margenNeto: margenNeto(neta, efectivo),
  };
}

export type PeriodoFinanzas = "mes" | "trimestre" | "semestre" | "anio";

export const FINANZAS_TABS = [
  { slug: "resumen", label: "Resumen" },
  { slug: "pl", label: "P&L" },
  { slug: "flujo", label: "Flujo de caja" },
  { slug: "indicadores", label: "Indicadores" },
  { slug: "balance", label: "Balance general" },
  { slug: "cxp", label: "CxP" },
  { slug: "gastos", label: "Gastos" },
  { slug: "pasivo", label: "Pasivo créditos" },
] as const;
