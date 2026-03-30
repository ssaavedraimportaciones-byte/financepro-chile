/**
 * POST /api/stripe/checkout
 * Crea una sesión de Stripe Checkout para suscripción mensual.
 * Body: { plan: "starter" | "professional" | "enterprise" }
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_PRICES, isPlanValido } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getEmpresaId } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { plan } = await req.json() as { plan: string };
    if (!isPlanValido(plan)) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    const priceId = STRIPE_PRICES[plan];
    if (!priceId) return NextResponse.json({ error: `Price ID para ${plan} no configurado` }, { status: 500 });

    const empresaId = await getEmpresaId(user.id);
    if (!empresaId) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://financepro-chile.netlify.app";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: { empresa_id: empresaId, user_id: user.id, plan },
      subscription_data: { metadata: { empresa_id: empresaId, plan } },
      success_url: `${appUrl}/mi-cuenta?success=1&plan=${plan}`,
      cancel_url:  `${appUrl}/mi-cuenta?canceled=1`,
      locale: "es",
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 });
  }
}
