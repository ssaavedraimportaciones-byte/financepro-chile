import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY ?? "financepro-admin-2026";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("x-admin-key");
  if (authHeader !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const empresas = await sql`
    SELECT e.id, e.nombre, e.rut, e.created_at, e.bloqueado,
           s.plan, s.estado, s.fecha_fin, s.monto AS monto_plan
    FROM fp_empresas e
    LEFT JOIN fp_subscripciones s ON s.empresa_id = e.id
    ORDER BY e.created_at DESC
  `;

  const PRECIOS: Record<string, number> = {
    starter: 19990, professional: 39990, enterprise: 79990,
  };

  const total = empresas.length;
  const enTrial = empresas.filter(e => e.estado === "trial" || !e.estado).length;
  const activos = empresas.filter(e => e.estado === "activa").length;
  const vencidas = empresas.filter(e => e.estado === "vencida" || e.estado === "cancelada").length;
  const mrr = empresas.filter(e => e.estado === "activa").reduce((sum, e) => sum + (PRECIOS[e.plan] ?? 0), 0);

  return NextResponse.json({ empresas, stats: { total, enTrial, activos, vencidas, mrr } });
}
