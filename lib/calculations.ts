// =============================================================
// Cálculos financieros y tributarios para Chile
// Basados en normativa SII vigente 2024-2025
// =============================================================

import type {
  CalculoIVA,
  CalculoPPM,
  LiquidacionSueldo,
  RetencionHonorarios,
  KPIFinanciero,
} from "@/types";

// ---------------------------------------------------------------
// IVA (Impuesto al Valor Agregado) - Tasa: 19%
// ---------------------------------------------------------------

export const TASA_IVA = 0.19;
export const TASA_PPM_PRO_PYME = 0.01;   // 1% ventas Pro Pyme
export const TASA_PPM_GENERAL = 0.015;    // 1.5% ventas régimen general

/** Calcula IVA a pagar en un período */
export function calcularIVA(
  ventasConFactura: number,
  comprasConFactura: number
): CalculoIVA {
  const iva_debito = ventasConFactura * TASA_IVA;
  const iva_credito = comprasConFactura * TASA_IVA;
  const iva_neto = Math.max(iva_debito - iva_credito, 0);
  return {
    iva_debito,
    iva_credito,
    iva_neto,
    periodo: new Date().toISOString().slice(0, 7),
  };
}

/** Precio con IVA incluido */
export function precioConIVA(neto: number): number {
  return neto * (1 + TASA_IVA);
}

/** Precio neto desde precio con IVA */
export function precioNeto(conIVA: number): number {
  return conIVA / (1 + TASA_IVA);
}

// ---------------------------------------------------------------
// PPM (Pago Provisional Mensual)
// ---------------------------------------------------------------

export function calcularPPM(
  ventasMes: number,
  regimen: "pro_pyme_general" | "pro_pyme_transparente" | "general" = "pro_pyme_general"
): CalculoPPM {
  const tasa = regimen === "general" ? TASA_PPM_GENERAL : TASA_PPM_PRO_PYME;
  return {
    ventas_periodo: ventasMes,
    tasa_ppm: tasa * 100,
    ppm_calculado: ventasMes * tasa,
    periodo: new Date().toISOString().slice(0, 7),
  };
}

// ---------------------------------------------------------------
// Impuesto a la Renta (estimación anual)
// ---------------------------------------------------------------

/**
 * Pro Pyme General: 25% sobre utilidad tributaria
 * Pro Pyme Transparente: los socios tributan en su global complementario
 */
export function estimarImpuestoRenta(
  utilidadAnual: number,
  regimen: "pro_pyme_general" | "pro_pyme_transparente" | "general"
): number {
  switch (regimen) {
    case "pro_pyme_general":
      return utilidadAnual * 0.25;
    case "pro_pyme_transparente":
      // Los socios tributan con sus propias tasas - estimación conservadora
      return utilidadAnual * 0.1; // depende del tramo
    case "general":
      return utilidadAnual * 0.27;
    default:
      return utilidadAnual * 0.25;
  }
}

// ---------------------------------------------------------------
// Liquidación de sueldo (empleados con contrato)
// Tasas vigentes 2024
// ---------------------------------------------------------------

const COTIZACION_AFP_BASE = 0.1;       // 10% (sin comisión AFP)
const COMISION_AFP_PROMEDIO = 0.0123;  // ~1.23% promedio AFP en Chile
const COTIZACION_FONASA = 0.07;        // 7% bruto
const SEGURO_CESANTIA = 0.006;         // 0.6% trabajador
const MUTUAL_EMPLEADOR = 0.0093;       // 0.93% empleador
const SIS_EMPLEADOR = 0.0149;          // 1.49% empleador
const SEGURO_CESANTIA_EMPLEADOR = 0.024; // 2.4% empleador

export function calcularLiquidacion(
  sueldo_bruto: number,
  tipoSalud: "fonasa" | "isapre" = "fonasa",
  montoIsapre = 0
): LiquidacionSueldo {
  const afp = sueldo_bruto * (COTIZACION_AFP_BASE + COMISION_AFP_PROMEDIO);
  const salud = tipoSalud === "fonasa"
    ? sueldo_bruto * COTIZACION_FONASA
    : montoIsapre;
  const seguro_cesantia = sueldo_bruto * SEGURO_CESANTIA;
  const total_descuentos = afp + salud + seguro_cesantia;
  const sueldo_liquido = sueldo_bruto - total_descuentos;

  // Costos adicionales que paga el empleador
  const mutual = sueldo_bruto * MUTUAL_EMPLEADOR;
  const sis = sueldo_bruto * SIS_EMPLEADOR;
  const cesantia_empleador = sueldo_bruto * SEGURO_CESANTIA_EMPLEADOR;
  const costo_total_empresa = sueldo_bruto + mutual + sis + cesantia_empleador;

  return {
    sueldo_bruto,
    afp: Math.round(afp),
    salud: Math.round(salud),
    seguro_cesantia: Math.round(seguro_cesantia),
    total_descuentos: Math.round(total_descuentos),
    sueldo_liquido: Math.round(sueldo_liquido),
    mutual: Math.round(mutual),
    sis: Math.round(sis),
    costo_total_empresa: Math.round(costo_total_empresa),
  };
}

// ---------------------------------------------------------------
// Honorarios - Retención 13.75%
// ---------------------------------------------------------------

export const TASA_RETENCION_HONORARIOS = 0.1375;

export function calcularHonorarios(montoBruto: number): RetencionHonorarios {
  const retencion = montoBruto * TASA_RETENCION_HONORARIOS;
  return {
    monto_bruto: montoBruto,
    retencion: Math.round(retencion),
    monto_liquido: Math.round(montoBruto - retencion),
  };
}

// ---------------------------------------------------------------
// Valor Hora del Fundador
// ---------------------------------------------------------------

export function calcularValorHora(
  sueldoReemplazo: number,
  horasMensuales: number,
  multiplicadorRiesgo: number
): { valor_hora: number; costo_mensual: number } {
  const valor_hora = (sueldoReemplazo / horasMensuales) * multiplicadorRiesgo;
  return {
    valor_hora: Math.round(valor_hora),
    costo_mensual: Math.round(valor_hora * horasMensuales),
  };
}

// ---------------------------------------------------------------
// KPIs financieros
// ---------------------------------------------------------------

export function calcularKPIs(params: {
  ingresos_mes: number;
  gastos_mes: number;
  cash_disponible: number;
  ingresos_con_factura: number;
  gastos_con_factura: number;
  regimen: "pro_pyme_general" | "pro_pyme_transparente" | "general";
}): KPIFinanciero {
  const { ingresos_mes, gastos_mes, cash_disponible, ingresos_con_factura, gastos_con_factura, regimen } = params;
  const utilidad_mes = ingresos_mes - gastos_mes;
  const iva = calcularIVA(ingresos_con_factura, gastos_con_factura);
  const ppm = calcularPPM(ingresos_mes, regimen);
  const burn_rate = gastos_mes;
  const runway_meses = burn_rate > 0 ? Math.floor(cash_disponible / burn_rate) : 99;

  return {
    ingresos_mes,
    gastos_mes,
    utilidad_mes,
    iva_proyectado: iva.iva_neto,
    ppm_proyectado: ppm.ppm_calculado,
    cashflow: ingresos_mes - gastos_mes - iva.iva_neto - ppm.ppm_calculado,
    burn_rate,
    runway_meses,
  };
}

// ---------------------------------------------------------------
// Detección de "gastos hormiga"
// ---------------------------------------------------------------

/**
 * Detecta categorías que superan el umbral del gasto mensual total.
 * Por defecto alerta si una categoría pequeña supera el 8%.
 */
export function detectarGastosHormiga(
  distribucion: Array<{ categoria: string; monto: number }>,
  totalGastos: number,
  umbral = 0.08
): Array<{ categoria: string; monto: number; porcentaje: number }> {
  const categoriasGrandes = ["capital_humano", "arriendo"];
  return distribucion
    .filter(({ categoria, monto }) => {
      if (categoriasGrandes.includes(categoria)) return false;
      const pct = monto / totalGastos;
      return pct >= umbral;
    })
    .map(({ categoria, monto }) => ({
      categoria,
      monto,
      porcentaje: (monto / totalGastos) * 100,
    }));
}

// ---------------------------------------------------------------
// Fondo de emergencia
// ---------------------------------------------------------------

/** Calcula cuántos meses de operación cubre el fondo */
export function calcularRunwayFondo(
  fondoAcumulado: number,
  gastosPromedioPorMes: number
): number {
  if (gastosPromedioPorMes <= 0) return 99;
  return parseFloat((fondoAcumulado / gastosPromedioPorMes).toFixed(1));
}

/** Cuánto debe aportarse mensualmente al fondo */
export function calcularAporteFondo(
  ingresosMes: number,
  porcentaje: number
): number {
  return Math.round(ingresosMes * (porcentaje / 100));
}
