import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sql, getEmpresaId } from "@/lib/db";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresaId = await getEmpresaId(user.id);
  if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const proyectos = await sql`SELECT * FROM proyectos WHERE empresa_id = ${empresaId}`;
  if (!proyectos.length) return NextResponse.json([]);

  // Calcular rentabilidad para cada proyecto
  const resultado = await Promise.all(proyectos.map(async (p) => {
    const [ing, gas] = await Promise.all([
      sql`SELECT COALESCE(SUM(monto),0) as total FROM ingresos WHERE proyecto_id = ${p.id}`,
      sql`SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE proyecto_id = ${p.id}`,
    ]);
    const ingresos = Number(ing[0]?.total ?? 0);
    const costos = Number(gas[0]?.total ?? 0);
    const utilidad = ingresos - costos;
    const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;
    return { ...p, ingresos, costos, utilidad, margen_porcentaje: margen };
  }));

  return NextResponse.json(resultado);
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresaId = await getEmpresaId(user.id);
  if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const body = await req.json();
  const { nombre, cliente, fecha_inicio, fecha_fin, estado = "activo", presupuesto } = body;

  if (!nombre || !fecha_inicio) {
    return NextResponse.json({ error: "Faltan campos: nombre, fecha_inicio" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO proyectos (empresa_id, nombre, cliente, fecha_inicio, fecha_fin, estado, presupuesto)
    VALUES (${empresaId}, ${nombre}, ${cliente ?? null}, ${fecha_inicio}, ${fecha_fin ?? null}, ${estado}, ${presupuesto ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
