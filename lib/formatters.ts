// =============================================================
// Formatters - moneda, fecha, porcentajes para Chile
// =============================================================

/** Formatea número como CLP (pesos chilenos) */
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formatea número como porcentaje */
export function formatPorcentaje(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Formatea fecha DD/MM/YYYY */
export function formatFecha(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString + "T00:00:00");
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Formatea número sin símbolo de moneda */
export function formatNumero(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Obtiene el mes actual como string "YYYY-MM" */
export function getMesActual(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Obtiene nombre corto del mes */
export function nombreMes(mesStr: string): string {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const [, mes] = mesStr.split("-");
  return meses[parseInt(mes) - 1] ?? mesStr;
}

/** Devuelve los últimos N meses como strings "YYYY-MM" */
export function getUltimosMeses(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    result.push(`${year}-${month}`);
  }
  return result;
}
