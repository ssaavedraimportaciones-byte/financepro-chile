/**
 * Cliente Neon para FinancePro Chile
 * Base de datos PostgreSQL 100% independiente de TransportPro
 * URL: ep-falling-pine-ac96en93 (sa-east-1, São Paulo)
 */
import { neon, Pool } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL no definida. Agrega la variable de entorno de Neon.");
}

export const sql = neon(DATABASE_URL);

// Pool para queries dinámicas (generic API route)
export const pool = new Pool({ connectionString: DATABASE_URL });

// Helper: obtener empresa_id del usuario autenticado
export async function getEmpresaId(userId: string): Promise<string | null> {
  const rows = await sql`
    SELECT id FROM empresas WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

// Helper: obtener o crear empresa del usuario
export async function getOrCreateEmpresa(userId: string, nombre = "Mi Empresa"): Promise<string> {
  let empresaId = await getEmpresaId(userId);
  if (!empresaId) {
    const rows = await sql`
      INSERT INTO empresas (user_id, nombre, rut, regimen_tributario)
      VALUES (${userId}, ${nombre}, '00.000.000-0', 'pro_pyme_general')
      RETURNING id
    `;
    empresaId = rows[0].id;
  }
  return empresaId;
}
