/**
 * Límites de recursos por plan en FinancePro Chile.
 * Usado en los endpoints POST para bloquear si se supera el límite.
 */
import { sql } from "@/lib/db";

export type Recurso = "proyectos" | "empleados";

interface Limite {
  max: number;       // -1 = ilimitado
  actual: number;
  permitido: boolean;
}

const LIMITES: Record<string, Record<Recurso, number>> = {
  trial:        { proyectos:  5, empleados:  3 },
  starter:      { proyectos:  5, empleados:  3 },
  professional: { proyectos: 30, empleados: 15 },
  enterprise:   { proyectos: -1, empleados: -1 },
};

/** Obtiene el plan actual de una empresa */
async function getPlan(empresaId: string): Promise<string> {
  const rows = await sql`
    SELECT plan, estado FROM subscripciones WHERE empresa_id = ${empresaId} LIMIT 1
  `;
  const sub = rows[0] as { plan?: string; estado?: string } | undefined;
  // Si no tiene suscripción activa o está vencida, restringir como trial
  if (!sub || sub.estado === "vencida" || sub.estado === "cancelada") return "trial";
  return sub.plan ?? "trial";
}

/**
 * Cuenta los registros actuales de un recurso para una empresa.
 * Se usan queries separadas por tipo para evitar inyección SQL
 * (el driver Neon no soporta interpolación de identificadores).
 */
async function contarActual(empresaId: string, recurso: Recurso): Promise<number> {
  let rows: Array<{ total?: number }>;

  if (recurso === "proyectos") {
    rows = await sql`
      SELECT COUNT(*)::int AS total FROM proyectos WHERE empresa_id = ${empresaId}
    `;
  } else {
    rows = await sql`
      SELECT COUNT(*)::int AS total FROM empleados WHERE empresa_id = ${empresaId}
    `;
  }

  return rows[0]?.total ?? 0;
}

/**
 * Verifica si una empresa puede crear un nuevo recurso.
 * @returns { permitido, max, actual }
 */
export async function checkLimit(empresaId: string, recurso: Recurso): Promise<Limite> {
  const plan    = await getPlan(empresaId);
  const limites = LIMITES[plan] ?? LIMITES.trial;
  const max     = limites[recurso] ?? 5;

  if (max === -1) return { max: -1, actual: 0, permitido: true }; // enterprise: ilimitado

  const actual = await contarActual(empresaId, recurso);
  return { max, actual, permitido: actual < max };
}
