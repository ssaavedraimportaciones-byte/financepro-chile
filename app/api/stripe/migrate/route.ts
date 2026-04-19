/**
 * GET /api/stripe/migrate?secret=fp_stripe_migrate
 * Agrega columnas de Stripe a la tabla subscripciones en Neon.
 * Ejecutar UNA SOLA VEZ tras deploy.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "fp_stripe_migrate") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    await sql`ALTER TABLE fp_subscripciones ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
    await sql`ALTER TABLE fp_subscripciones ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`;
    await sql`ALTER TABLE fp_subscripciones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS fp_subscripciones_empresa_id_key ON fp_subscripciones (empresa_id)`;
    // Columna para bloquear empresas por no pago
    await sql`ALTER TABLE fp_empresas ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT FALSE`;
    return NextResponse.json({ ok: true, message: "Migración completada ✓" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
