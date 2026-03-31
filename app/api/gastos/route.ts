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
    rows = await sql`SELECT * FROM fp_gastos WHERE empresa_id = ${empresaId} AND fecha >= ${periodo+"-01"}::date AND fecha <= ${periodo+"-31"}::date AND categoria = ${categoria} ORDER BY fecha DESC`;
  } else if (periodo) {
    rows = await sql`SELECT * FROM fp_gastos WHERE empresa_id = ${empresaId} AND fecha >= ${periodo+"-01"}::date AND fecha <= ${periodo+"-31"}::date ORDER BY fecha DESC`;
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

  const rows = await sql`
    INSERT INTO fp_gastos (empresa_id, descripcion, monto, monto_iva, fecha, categoria, subcategoria, proyecto_id, proveedor)
    VALUES (${empresaId}, ${descripcion}, ${monto}, ${monto_iva}, ${fecha}, ${categoria}, ${subcategoria ?? null}, ${proyecto_id ?? null}, ${proveedor ?? null})
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

  // Verificar que el gasto pertenece al usuario antes de borrar
  const empresaId = await getEmpresaId(user.id);
  await sql`DELETE FROM fp_gastos WHERE id = ${id} AND empresa_id = ${empresaId}`;
  return NextResponse.json({ ok: true });
}
