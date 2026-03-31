/**
 * POST /api/admin/update-plan
 * Cambia el plan/estado de una empresa o la bloquea/desbloquea.
 * Headers: x-admin-key: <ADMIN_SECRET_KEY>
 * Body: { empresaId, plan?, estado?, bloqueado? }
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? "financepro-admin-2026";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { empresaId, plan, estado, bloqueado } = await req.json() as {
      empresaId: string;
      plan?: string;
      estado?: string;
      bloqueado?: boolean;
    };

    if (!empresaId) {
      return NextResponse.json({ error: "empresaId es requerido" }, { status: 400 });
    }

    // ── Bloquear / desbloquear empresa ──
    if (typeof bloqueado === "boolean") {
      await sql`
        UPDATE fp_empresas SET bloqueado = ${bloqueado} WHERE id = ${empresaId}
      `;
      return NextResponse.json({ ok: true, empresaId, bloqueado });
    }

    // ── Cambiar plan / estado de suscripción ──
    if (!plan) {
      return NextResponse.json({ error: "plan es requerido para cambiar suscripción" }, { status: 400 });
    }

    const fechaFin = new Date();
    fechaFin.setMonth(fechaFin.getMonth() + 1);

    await sql`
      INSERT INTO fp_subscripciones (empresa_id, plan, estado, fecha_inicio, fecha_fin)
      VALUES (${empresaId}, ${plan}, ${estado ?? "activa"}, NOW(), ${fechaFin.toISOString()})
      ON CONFLICT (empresa_id)
      DO UPDATE SET
        plan         = ${plan},
        estado       = ${estado ?? "activa"},
        fecha_inicio = NOW(),
        fecha_fin    = ${fechaFin.toISOString()},
        updated_at   = NOW()
    `;

    return NextResponse.json({ ok: true, empresaId, plan, estado });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
