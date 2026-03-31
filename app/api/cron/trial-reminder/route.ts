/**
 * GET /api/cron/trial-reminder
 * Cron diario (10am Chile = 13:00 UTC):
 * Envía recordatorio a empresas con trial que expira en 0, 1 o 3 días.
 *
 * Netlify Scheduled Function (netlify.toml):
 *   [[scheduled_functions]]
 *   name = "trial-reminder"
 *   cron = "0 13 * * *"
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendTrialExpira } from "@/lib/email";
import { PLAN_PRECIOS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";

const CRON_SECRET = process.env.CRON_SECRET ?? "fp_cron_2026";

export async function GET(req: NextRequest) {
  if (
    req.headers.get("x-cron-secret") !== CRON_SECRET &&
    req.nextUrl.searchParams.get("secret") !== CRON_SECRET
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    // Buscar trials que expiran en 3 días, mañana, o hoy
    const empresasEnRiesgo = await sql`
      SELECT
        e.id            AS empresa_id,
        e.nombre,
        e.user_id,
        s.plan,
        s.fecha_fin,
        (s.fecha_fin::date - CURRENT_DATE) AS dias_restantes
      FROM fp_subscripciones s
      JOIN fp_empresas e ON e.id = s.empresa_id
      WHERE s.estado = 'trial'
        AND s.fecha_fin IS NOT NULL
        AND (s.fecha_fin::date - CURRENT_DATE) IN (3, 1, 0)
    `;

    // Cliente admin para leer emails desde Supabase Auth
    let adminClient: ReturnType<typeof createAdminClient> | null = null;
    try {
      adminClient = createAdminClient();
    } catch {
      console.warn("[cron] Supabase admin no disponible — solo logging");
    }

    let enviados = 0;
    let errores = 0;

    for (const row of empresasEnRiesgo as Array<{
      empresa_id: string;
      nombre: string;
      user_id: string;
      plan: string;
      dias_restantes: number;
    }>) {
      try {
        // Obtener email del usuario desde Supabase Auth
        let email: string | null = null;
        if (adminClient) {
          const { data: authUser } = await adminClient.auth.admin.getUserById(row.user_id);
          email = authUser?.user?.email ?? null;
        }

        if (!email) {
          console.warn(`[cron] Sin email para user_id=${row.user_id} empresa=${row.nombre}`);
          errores++;
          continue;
        }

        const planKey = row.plan in PLAN_PRECIOS ? row.plan : "professional";
        const precioMensual = PLAN_PRECIOS[planKey as keyof typeof PLAN_PRECIOS] ?? 39990;

        await sendTrialExpira(email, {
          nombreEmpresa: row.nombre,
          diasRestantes: row.dias_restantes,
          plan: planKey,
          precioMensual,
        });

        console.log(`[cron] ✉ ${email} → ${row.nombre} (${row.dias_restantes}d restantes)`);
        enviados++;
      } catch (err) {
        console.error(`[cron] Error en empresa ${row.nombre}:`, err);
        errores++;
      }
    }

    return NextResponse.json({
      ok: true,
      procesados: (empresasEnRiesgo as unknown[]).length,
      enviados,
      errores,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/trial-reminder]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
