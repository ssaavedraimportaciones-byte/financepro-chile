/**
 * Cliente Neon para FinancePro Chile
 * Base de datos PostgreSQL 100% independiente de TransportPro
 * URL: ep-falling-pine-ac96en93 (sa-east-1, São Paulo)
 */
import { neon, Pool } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

// Lazy-initialized: only throws at runtime when a query is made, not at build time
export const sql = DATABASE_URL
  ? neon(DATABASE_URL)
  : (() => { throw new Error("DATABASE_URL no definida."); }) as ReturnType<typeof neon>;

export const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : null as unknown as Pool;

// Helper: obtener empresa_id del usuario autenticado
export async function getEmpresaId(userId: string): Promise<string | null> {
  const rows = await sql`
    SELECT id FROM fp_empresas WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

// Helper: obtener o crear empresa del usuario (atómico — safe bajo concurrencia)
export async function getOrCreateEmpresa(userId: string, nombre = "Mi Empresa"): Promise<string> {
  await sql`
    INSERT INTO fp_empresas (user_id, nombre, rut, regimen_tributario)
    VALUES (${userId}, ${nombre}, '00.000.000-0', 'pro_pyme_general')
    ON CONFLICT (user_id) DO NOTHING
  `;
  const rows = await sql`SELECT id FROM fp_empresas WHERE user_id = ${userId} LIMIT 1`;
  return rows[0].id;
}
