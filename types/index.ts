// =============================================================
// FinancePro Chile - Tipos TypeScript
// =============================================================

// ---- Entidades base ----

export type Empresa = {
  id: string;
  nombre: string;
  rut: string;
  giro: string;
  regimen_tributario: "pro_pyme_general" | "pro_pyme_transparente" | "general";
  created_at: string;
};

export type Ingreso = {
  id: string;
  empresa_id: string;
  descripcion: string;
  monto: number;       // CLP neto (sin IVA)
  monto_iva: number;   // IVA incluido
  fecha: string;
  categoria: CategoriaIngreso;
  proyecto_id?: string;
  cliente?: string;
  documento?: string;  // número de factura/boleta
  created_at: string;
};

export type CategoriaIngreso =
  | "servicios"
  | "venta_producto"
  | "honorarios"
  | "arriendo"
  | "otro";

export type Gasto = {
  id: string;
  empresa_id: string;
  descripcion: string;
  monto: number;       // monto neto
  monto_iva: number;   // IVA crédito fiscal
  fecha: string;
  categoria: CategoriaGasto;
  subcategoria?: string;
  proyecto_id?: string;
  proveedor?: string;
  imagen_url?: string; // foto de boleta/factura
  created_at: string;
};

export type CategoriaGasto =
  | "formalizacion"
  | "tecnologia"
  | "operativo"
  | "capital_humano"
  | "tributario"
  | "marketing"
  | "arriendo"
  | "otro";

export type Proyecto = {
  id: string;
  empresa_id: string;
  nombre: string;
  cliente?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: "activo" | "pausado" | "terminado";
  presupuesto?: number;
  created_at: string;
};

export type Empleado = {
  id: string;
  empresa_id: string;
  nombre: string;
  rut: string;
  cargo: string;
  tipo: "contrato" | "honorarios";
  sueldo_bruto: number;
  afp: string;
  salud: "fonasa" | "isapre";
  monto_salud: number; // 7% bruto o monto isapre
  created_at: string;
};

export type CostoFormalizacion = {
  id: string;
  empresa_id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  tipo: TipoFormalizacion;
  amortizacion_meses: number;
  costo_mensual_amortizado: number;
  created_at: string;
};

export type TipoFormalizacion =
  | "constitucion"
  | "fea"
  | "notaria"
  | "marca_inapi"
  | "patente_municipal"
  | "otro";

export type CostoTecnologico = {
  id: string;
  empresa_id: string;
  descripcion: string;
  proveedor: string;
  costo: number;
  moneda: "CLP" | "USD" | "EUR";
  frecuencia: "mensual" | "anual" | "unico";
  categoria: TipoTecnologia;
  proyecto_id?: string;
  fecha_vencimiento?: string;
  created_at: string;
};

export type TipoTecnologia =
  | "hosting"
  | "dominio"
  | "base_datos"
  | "despliegue"
  | "api_externa"
  | "licencia"
  | "pasarela_pago"
  | "otro";

export type RegistroTributario = {
  id: string;
  empresa_id: string;
  periodo: string;    // "2024-03" (año-mes)
  iva_debito: number;
  iva_credito: number;
  iva_pagar: number;
  ppm: number;
  pagado: boolean;
  fecha_pago?: string;
  created_at: string;
};

export type FondoEmergencia = {
  id: string;
  empresa_id: string;
  porcentaje_ahorro: number;  // ej: 5
  monto_acumulado: number;
  meta: number;
  updated_at: string;
};

export type ConfigFundador = {
  id: string;
  empresa_id: string;
  nombre: string;
  sueldo_reemplazo: number;    // ¿cuánto costaría contratar a alguien igual?
  horas_mensuales: number;
  multiplicador_riesgo: number; // 1.3 - 1.5
  valor_hora: number;           // calculado
  updated_at: string;
};

// ---- KPIs y métricas ----

export type KPIFinanciero = {
  ingresos_mes: number;
  gastos_mes: number;
  utilidad_mes: number;
  iva_proyectado: number;
  ppm_proyectado: number;
  cashflow: number;
  burn_rate: number;
  runway_meses: number;
};

export type RentabilidadProyecto = {
  proyecto_id: string;
  nombre: string;
  ingresos: number;
  costos: number;
  utilidad: number;
  margen_porcentaje: number;
};

export type EvolucionMensual = {
  mes: string;       // "Ene", "Feb", etc.
  ingresos: number;
  gastos: number;
  utilidad: number;
};

export type DistribucionCostos = {
  categoria: string;
  monto: number;
  porcentaje: number;
};

// ---- Cálculos tributarios chilenos ----

export type CalculoIVA = {
  iva_debito: number;   // 19% de ventas con factura
  iva_credito: number;  // 19% de compras con factura
  iva_neto: number;     // débito - crédito (lo que se paga)
  periodo: string;
};

export type CalculoPPM = {
  ventas_periodo: number;
  tasa_ppm: number;     // % (1% pro pyme por defecto)
  ppm_calculado: number;
  periodo: string;
};

export type LiquidacionSueldo = {
  sueldo_bruto: number;
  afp: number;           // ~10% + comisión
  salud: number;         // 7% o monto isapre
  seguro_cesantia: number; // 0.6%
  total_descuentos: number;
  sueldo_liquido: number;
  // Costo empresa
  mutual: number;        // ~0.93%
  sis: number;           // 1.49%
  costo_total_empresa: number;
};

export type RetencionHonorarios = {
  monto_bruto: number;
  retencion: number;    // 13.75%
  monto_liquido: number;
};
