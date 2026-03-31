/**
 * POST /api/stripe/portal
 * Crea una sesión del Customer Portal de Stripe para que el usuario
 * pueda cancelar, cambiar plan o actualizar tarjeta sin pasar por soporte.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Obtener stripe_customer_id desde la DB
    const rows = await sql`
      SELECT s.stripe_customer_id
      FROM fp_subscripciones s
      JOIN fp_empresas e ON e.id = s.empresa_id
      WHERE e.user_id = ${user.id}
      LIMIT 1
    `;

    const customerId = (rows[0] as { stripe_customer_id?: string })?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No tienes una suscripción de pago activa" },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://financepro-chile.netlify.app";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/mi-cuenta`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: "Error al abrir portal de pagos" }, { status: 500 });
  }
}
