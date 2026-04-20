/**
 * POST /api/admin/update-plan
 * Cambia el plan/estado de una empresa, la bloquea/desbloquea, o extiende el trial.
 * Headers: x-admin-key: <ADMIN_SECRET_KEY>
 * Body:
 *   { empresaId, bloqueado: boolean }            → bloquear/desbloquear
 *   { empresaId, plan, estado? }                 → cambiar plan/estado
 *   { empresaId, extenderTrial: true, dias? }    → extender trial N días (default 14)
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? "financepro-admin-2026";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json() as {
      empresaId: string;
      plan?: string;
      estado?: string;
      bloqueado?: boolean;
      extenderTrial?: boolean;
      dias?: number;
    };
    const { empresaId, plan, estado, bloqueado, extenderTrial, dias } = body;

    if (!empresaId) {
      return NextResponse.json({ error: "empresaId es requerido" }, { status: 400 });
    }

    // ── Bloquear / desbloquear empresa ──
    if (typeof bloqueado === "boolean") {
      await sql`UPDATE fp_empresas SET bloqueado = ${bloqueado} WHERE id = ${empresaId}`;
      return NextResponse.json({ ok: true, empresaId, bloqueado });
    }

    // ── Extender trial ──
    if (extenderTrial) {
      const addDias = dias ?? 14;
      await sql`
        INSERT INTO fp_subscripciones (empresa_id, plan, estado, fecha_trial_fin)
        VALUES (${empresaId}, 'professional', 'trial', NOW() + (${addDias} || ' days')::interval)
        ON CONFLICT (empresa_id) DO UPDATE SET
          estado          = 'trial',
          fecha_trial_fin = GREATEST(
            COALESCE(fp_subscripciones.fecha_trial_fin, NOW()),
            NOW()
          ) + (${addDias} || ' days')::interval
      `;
      return NextResponse.json({ ok: true, empresaId, extendedDays: addDias });
    }

    // ── Cambiar plan / estado de suscripción ──
    if (!plan) {
      return NextResponse.json({ error: "plan es requerido para cambiar suscripción" }, { status: 400 });
    }

    const nuevoEstado = estado ?? "activa";
    const fechaVencimiento = new Date();
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

    await sql`
      INSERT INTO fp_subscripciones (empresa_id, plan, estado, fecha_vencimiento)
      VALUES (${empresaId}, ${plan}, ${nuevoEstado}, ${fechaVencimiento.toISOString()})
      ON CONFLICT (empresa_id) DO UPDATE SET
        plan              = ${plan},
        estado            = ${nuevoEstado},
        fecha_vencimiento = ${fechaVencimiento.toISOString()}
    `;

    return NextResponse.json({ ok: true, empresaId, plan, estado: nuevoEstado });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
