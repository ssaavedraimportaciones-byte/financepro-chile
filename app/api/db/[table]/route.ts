/**
 * API Genérica para FinancePro — apunta a Neon (PostgreSQL dedicado)
 * GET/POST/PATCH/DELETE /api/db/:table
 *
 * Seguridad:
 * - Requiere autenticación Supabase (cookie de sesión)
 * - Filtra automáticamente por empresa_id del usuario autenticado
 * - Whitelist de tablas permitidas
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { pool, getEmpresaId } from "@/lib/db";
import { checkLimit, type Recurso } from "@/lib/plan-limits";

// Solo estas tablas son accesibles via este endpoint (prefijo fp_ para aislar de otras apps)
const ALLOWED_TABLES = new Set([
  "fp_empresas", "fp_proyectos", "fp_ingresos", "fp_gastos", "fp_empleados",
  "fp_costos_formalizacion", "fp_costos_tecnologicos", "fp_registros_tributarios",
  "fp_fondo_emergencia", "fp_config_fundador", "fp_subscripciones",
]);

// Validar nombre de columna (solo letras, números, guion bajo)
const SAFE_COL = /^[a-z_][a-z0-9_]*$/;

type Params = { params: { table: string } };

// ---------- GET ----------
export async function GET(req: NextRequest, { params }: Params) {
  const table = params.table;
  if (!ALLOWED_TABLES.has(table)) return NextResponse.json({ error: "Tabla no permitida" }, { status: 403 });

  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { userId, empresaId } = auth;

  const sp = req.nextUrl.searchParams;
  const isSingle = sp.get("_single") === "1";

  const { whereClause, values } = buildWhere(table, userId, empresaId ?? "", sp);

  const orderParam = sp.get("_order");
  let orderSql = "ORDER BY created_at DESC";
  if (orderParam) {
    const [col, dir] = orderParam.split(".");
    if (SAFE_COL.test(col)) {
      orderSql = `ORDER BY ${col} ${dir === "asc" ? "ASC" : "DESC"}`;
    }
  }

  const queryStr = `SELECT * FROM ${table} ${whereClause} ${orderSql}`;
  const result = await pool.query(queryStr, values);

  if (isSingle) {
    return NextResponse.json(result.rows[0] ?? null);
  }
  return NextResponse.json(result.rows);
}

// ---------- POST ----------
export async function POST(req: NextRequest, { params }: Params) {
  const table = params.table;
  if (!ALLOWED_TABLES.has(table)) return NextResponse.json({ error: "Tabla no permitida" }, { status: 403 });

  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { userId, empresaId } = auth;

  // Verificar límites del plan para proyectos y empleados
  const RECURSOS_LIMITADOS: Set<string> = new Set(["fp_proyectos", "fp_empleados"]);
  if (RECURSOS_LIMITADOS.has(table) && empresaId) {
    try {
      const { permitido, max, actual } = await checkLimit(empresaId, table as Recurso);
      if (!permitido) {
        return NextResponse.json(
          { error: `Límite de plan alcanzado: tienes ${actual} de ${max} ${table} permitidos. Sube de plan para agregar más.` },
          { status: 403 }
        );
      }
    } catch { /* si falla el check de límite, dejar pasar */ }
  }

  const body = await req.json();

  // Inyectar user_id o empresa_id automáticamente
  if (table === "fp_empresas") {
    body.user_id = userId;
  } else if (empresaId) {
    body.empresa_id = empresaId;
  }

  const cols = Object.keys(body).filter(k => SAFE_COL.test(k));
  const vals = cols.map(k => body[k]);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");

  const sp = req.nextUrl.searchParams;
  const isUpsert = sp.get("_upsert") === "1";
  const onConflict = sp.get("_conflict");

  let queryStr = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
  if (isUpsert && onConflict) {
    const updateCols = cols.filter(c => !onConflict.split(",").includes(c));
    const updateSet = updateCols.map((c, i) => `${c} = $${cols.indexOf(c) + 1}`).join(", ");
    queryStr += ` ON CONFLICT (${onConflict}) DO UPDATE SET ${updateSet}`;
  }
  queryStr += " RETURNING *";

  const result = await pool.query(queryStr, vals);
  return NextResponse.json(result.rows, { status: 201 });
}

// ---------- PATCH ----------
export async function PATCH(req: NextRequest, { params }: Params) {
  const table = params.table;
  if (!ALLOWED_TABLES.has(table)) return NextResponse.json({ error: "Tabla no permitida" }, { status: 403 });

  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { userId, empresaId } = auth;

  const body = await req.json();
  const sp = req.nextUrl.searchParams;

  const cols = Object.keys(body).filter(k => SAFE_COL.test(k) && k !== "id");
  const vals: unknown[] = cols.map(k => body[k]);
  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");

  // Add security filter
  const { whereClause, values: whereVals } = buildWhere(table, userId, empresaId ?? "", sp, cols.length);
  const allVals = [...vals, ...whereVals];

  const queryStr = `UPDATE ${table} SET ${setClause} ${whereClause} RETURNING *`;
  const result = await pool.query(queryStr, allVals);
  return NextResponse.json(result.rows[0] ?? null);
}

// ---------- DELETE ----------
export async function DELETE(req: NextRequest, { params }: Params) {
  const table = params.table;
  if (!ALLOWED_TABLES.has(table)) return NextResponse.json({ error: "Tabla no permitida" }, { status: 403 });

  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { userId, empresaId } = auth;

  const sp = req.nextUrl.searchParams;
  const { whereClause, values } = buildWhere(table, userId, empresaId ?? "", sp);

  await pool.query(`DELETE FROM ${table} ${whereClause}`, values);
  return NextResponse.json({ ok: true });
}

// ========== Helpers ==========

async function getAuth(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const empresaId = await getEmpresaId(user.id);
    return { userId: user.id, empresaId };
  } catch {
    return null;
  }
}

function buildWhere(
  table: string,
  userId: string,
  empresaId: string,
  sp: URLSearchParams,
  offset = 0
): { whereClause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = offset + 1;

  // Security: scope automáticamente
  if (table === "fp_empresas") {
    conditions.push(`user_id = $${idx++}`);
    values.push(userId);
  } else if (empresaId) {
    conditions.push(`empresa_id = $${idx++}`);
    values.push(empresaId);
  }

  // Extra filters from query params
  for (const [key, val] of sp.entries()) {
    if (key.startsWith("_") || key === "select") continue;
    if (!SAFE_COL.test(key)) continue;

    const dotIdx = val.indexOf(".");
    if (dotIdx === -1) continue;
    const op = val.substring(0, dotIdx);
    const value = val.substring(dotIdx + 1);

    switch (op) {
      case "eq":  conditions.push(`${key} = $${idx++}`);  values.push(value); break;
      case "neq": conditions.push(`${key} != $${idx++}`); values.push(value); break;
      case "gte": conditions.push(`${key} >= $${idx++}`); values.push(value); break;
      case "lte": conditions.push(`${key} <= $${idx++}`); values.push(value); break;
      case "is":  conditions.push(`${key} IS ${value === "null" ? "NULL" : value}`); break;
    }
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}
