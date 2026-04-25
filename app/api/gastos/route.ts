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
  const categoria = req.nextUrl.searchParams.get("categoria");

  let rows;
  if (periodo && categoria) {
    rows = await sql`SELECT * FROM fp_gastos WHERE empresa_id = ${empresaId} AND fecha >= ${periodo+"-01"}::date AND fecha < (${periodo+"-01"}::date + INTERVAL '1 month') AND categoria = ${categoria} ORDER BY fecha DESC`;
  } else if (periodo) {
    rows = await sql`SELECT * FROM fp_gastos WHERE empresa_id = ${empresaId} AND fecha >= ${periodo+"-01"}::date AND fecha < (${periodo+"-01"}::date + INTERVAL '1 month') ORDER BY fecha DESC`;
  } else if (categoria) {
    rows = await sql`SELECT * FROM fp_gastos WHERE empresa_id = ${empresaId} AND categoria = ${categoria} ORDER BY fecha DESC`;
  } else {
    rows = await sql`SELECT * FROM fp_gastos WHERE empresa_id = ${empresaId} ORDER BY fecha DESC`;
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
  const { descripcion, monto, monto_iva = 0, fecha, categoria, subcategoria, proyecto_id, proveedor } = body;

  if (!descripcion || !monto || !fecha || !categoria) {
    return NextResponse.json({ error: "Faltan campos: descripcion, monto, fecha, categoria" }, { status: 400 });
  }

  // Validación: monto > 0, monto_iva >= 0, fecha válida
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
    INSERT INTO fp_gastos (empresa_id, descripcion, monto, monto_iva, fecha, categoria, subcategoria, proyecto_id, proveedor)
    VALUES (${empresaId}, ${descripcion}, ${montoNum}, ${montoIvaNum}, ${fecha}, ${categoria}, ${subcategoria ?? null}, ${proyecto_id ?? null}, ${proveedor ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const empresaId = await getEmpresaId(user.id);
  if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const result = await sql`DELETE FROM fp_gastos WHERE id = ${id} AND empresa_id = ${empresaId}`;
  if (result.length === 0) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
