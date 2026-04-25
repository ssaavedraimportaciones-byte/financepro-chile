import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sql, getEmpresaId } from "@/lib/db";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresaId = await getEmpresaId(user.id);
  if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const periodo = req.nextUrl.searchParams.get("periodo");

  let rows;
  if (periodo) {
    rows = await sql`
      SELECT * FROM fp_ingresos
      WHERE empresa_id = ${empresaId}
        AND fecha >= ${periodo + "-01"}::date
        AND fecha < (${periodo + "-01"}::date + INTERVAL '1 month')
      ORDER BY fecha DESC
    `;
  } else {
    rows = await sql`
      SELECT * FROM fp_ingresos WHERE empresa_id = ${empresaId} ORDER BY fecha DESC
    `;
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresaId = await getEmpresaId(user.id);
  if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const body = await req.json();
  const { descripcion, monto, monto_iva = 0, fecha, categoria = "servicios", proyecto_id, cliente, documento } = body;

  if (!descripcion || !monto || !fecha) {
    return NextResponse.json({ error: "Faltan campos: descripcion, monto, fecha" }, { status: 400 });
  }

  const montoNum = parseFloat(monto);
  const montoIvaNum = parseFloat(monto_iva ?? 0);
  if (isNaN(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: "Monto debe ser mayor a 0" }, { status: 400 });
  }
  if (isNaN(montoIvaNum) || montoIvaNum < 0) {
    return NextResponse.json({ error: "Monto IVA no puede ser negativo" }, { status: 400 });
  }
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO fp_ingresos (empresa_id, descripcion, monto, monto_iva, fecha, categoria, proyecto_id, cliente, documento)
    VALUES (${empresaId}, ${descripcion}, ${montoNum}, ${montoIvaNum}, ${fecha}, ${categoria}, ${proyecto_id ?? null}, ${cliente ?? null}, ${documento ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
