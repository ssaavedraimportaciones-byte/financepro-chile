import { NextRequest, NextResponse } from "next/server";
import { calcularValorHora } from "@/lib/calculations";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sql, getEmpresaId } from "@/lib/db";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresaId = await getEmpresaId(user.id);
  if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const rows = await sql`SELECT * FROM config_fundador WHERE empresa_id = ${empresaId} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "Config no encontrada" }, { status: 404 });

  const config = rows[0];
  const { valor_hora, costo_mensual } = calcularValorHora(
    config.sueldo_reemplazo,
    config.horas_mensuales,
    config.multiplicador_riesgo
  );
  return NextResponse.json({ ...config, valor_hora, costo_mensual });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    sueldo_reemplazo = 2000000,
    horas_mensuales = 160,
    multiplicador_riesgo = 1.4,
  } = body;

  const { valor_hora, costo_mensual } = calcularValorHora(sueldo_reemplazo, horas_mensuales, multiplicador_riesgo);

  return NextResponse.json({
    sueldo_reemplazo,
    horas_mensuales,
    multiplicador_riesgo,
    valor_hora,
    costo_mensual,
    valor_hora_base: Math.round(sueldo_reemplazo / horas_mensuales),
  });
}
