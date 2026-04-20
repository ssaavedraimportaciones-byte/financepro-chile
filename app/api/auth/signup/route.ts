import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sql } from "@/lib/db";
import { sendBienvenida } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nombre, rut, giro, regimen } = body;

    if (!email || !password || !nombre || !rut) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: email, password, nombre, rut" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Step 1: Crear usuario con Supabase Auth (auto-confirmado)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este email ya está registrado. Intenta iniciar sesión." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message ?? "Error al crear la cuenta" },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Error inesperado al crear el usuario" }, { status: 500 });
    }

    const regimenVal = ["pro_pyme_general", "pro_pyme_transparente", "general"].includes(
      String(regimen ?? "").trim()
    ) ? String(regimen).trim() : "pro_pyme_general";

    // Step 2: Crear empresa en Neon (DB independiente de FinancePro)
    try {
      const rows = await sql`
        INSERT INTO fp_empresas (user_id, nombre, rut, giro, regimen_tributario)
        VALUES (
          ${authData.user.id},
          ${String(nombre).trim()},
          ${String(rut).trim()},
          ${giro ? String(giro).trim() : null},
          ${regimenVal}
        )
        RETURNING id
      `;
      const empresaId = rows[0]?.id as string;

      // Step 3: Crear registro de suscripción en trial (14 días)
      const fechaTrialFin = new Date();
      fechaTrialFin.setDate(fechaTrialFin.getDate() + 14);
      try {
        await sql`
          INSERT INTO fp_subscripciones (empresa_id, plan, estado, fecha_trial_fin)
          VALUES (${empresaId}, 'professional', 'trial', ${fechaTrialFin.toISOString()})
          ON CONFLICT (empresa_id) DO NOTHING
        `;
      } catch { /* no bloquear si ya existe */ }

      // Enviar email de bienvenida (no bloquea si falla)
      sendBienvenida(String(email).trim(), {
        nombreEmpresa: String(nombre).trim(),
        plan: "professional",
        diasTrial: 14,
      });
      return NextResponse.json({ success: true, userId: authData.user.id, empresaId });
    } catch (dbErr) {
      // Rollback auth user si falla la DB
      await admin.auth.admin.deleteUser(authData.user.id);
      const msg = dbErr instanceof Error ? dbErr.message : "Error DB";
      return NextResponse.json({ error: "Error al guardar empresa: " + msg }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error en el registro: " + message }, { status: 500 });
  }
}
