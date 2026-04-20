import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase-admin";

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY ?? "financepro-admin-2026";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("x-admin-key");
  if (authHeader !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const empresas = await sql`
    SELECT e.id, e.nombre, e.rut, e.user_id, e.created_at, e.bloqueado,
           s.plan, s.estado,
           CASE WHEN s.estado = 'trial' THEN s.fecha_trial_fin ELSE s.fecha_vencimiento END AS fecha_fin
    FROM fp_empresas e
    LEFT JOIN fp_subscripciones s ON s.empresa_id = e.id
    ORDER BY e.created_at DESC
  `;

  // Enrich with emails from Supabase Auth (best-effort; may fail in demo mode)
  let emailMap: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    emailMap = Object.fromEntries((data?.users ?? []).map(u => [u.id, u.email ?? ""]));
  } catch { /* demo mode or missing service key */ }

  const enriched = empresas.map(e => ({
    ...e,
    email: emailMap[e.user_id as string] ?? null,
  }));

  const PRECIOS: Record<string, number> = {
    starter: 19990, professional: 39990, enterprise: 79990,
  };

  const total = enriched.length;
  const enTrial = enriched.filter(e => e.estado === "trial" || !e.estado).length;
  const activos = enriched.filter(e => e.estado === "activa").length;
  const vencidas = enriched.filter(e => e.estado === "vencida" || e.estado === "cancelada").length;
  const mrr = enriched.filter(e => e.estado === "activa").reduce((sum, e) => sum + (PRECIOS[e.plan as string] ?? 0), 0);

  return NextResponse.json({ empresas: enriched, stats: { total, enTrial, activos, vencidas, mrr } });
}
