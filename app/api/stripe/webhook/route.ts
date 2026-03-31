/**
 * POST /api/stripe/webhook
 * Recibe eventos de Stripe y actualiza el estado de la suscripción en Neon.
 * IMPORTANTE: Next.js App Router necesita leer el body RAW (no parseado).
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sql } from "@/lib/db";
import { sendPagoConfirmado } from "@/lib/email";
import Stripe from "stripe";

// Next.js App Router: no parsear el body automáticamente
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature") ?? "";
  const secret  = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[webhook] Firma inválida:", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  // ──────────────────────────────────────────────────────────
  // checkout.session.completed → pago inicial exitoso
  // ──────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const empresaId        = session.metadata?.empresa_id;
    const plan             = session.metadata?.plan ?? "professional";
    const customerId       = session.customer as string;
    const subscriptionId   = session.subscription as string;

    if (!empresaId) {
      console.error("[webhook] checkout.session sin empresa_id en metadata");
      return NextResponse.json({ ok: true }); // no reintentar
    }

    try {
      // Calcular fecha de vencimiento (1 mes)
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 1);

      // Actualizar o crear registro de suscripción
      await sql`
        INSERT INTO fp_subscripciones (empresa_id, plan, estado, fecha_inicio, fecha_fin, stripe_customer_id, stripe_subscription_id)
        VALUES (${empresaId}, ${plan}, 'activa', NOW(), ${fechaFin.toISOString()}, ${customerId}, ${subscriptionId})
        ON CONFLICT (empresa_id)
        DO UPDATE SET
          plan                    = ${plan},
          estado                  = 'activa',
          fecha_inicio            = NOW(),
          fecha_fin               = ${fechaFin.toISOString()},
          stripe_customer_id      = ${customerId},
          stripe_subscription_id  = ${subscriptionId},
          updated_at              = NOW()
      `;

      // Email del usuario: Stripe lo incluye en customer_details (más simple que la unión con auth)
      const emailUsuario = session.customer_details?.email ?? session.customer_email ?? "";

      if (emailUsuario) {
        await sendPagoConfirmado(emailUsuario, { plan, fechaFin: fechaFin.toLocaleDateString("es-CL") });
      }

      console.log(`[webhook] Suscripción activada: empresa=${empresaId} plan=${plan}`);
    } catch (dbErr) {
      console.error("[webhook] Error actualizando suscripción:", dbErr);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  // ──────────────────────────────────────────────────────────
  // customer.subscription.deleted → cancelación
  // ──────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const empresaId = sub.metadata?.empresa_id;
    if (empresaId) {
      await sql`
        UPDATE fp_subscripciones SET estado = 'cancelada', updated_at = NOW()
        WHERE empresa_id = ${empresaId}

      `;
      console.log(`[webhook] Suscripción cancelada: empresa=${empresaId}`);
    }
  }

  // ──────────────────────────────────────────────────────────
  // invoice.payment_failed → pago falló
  // ──────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_failed") {
    const invoice  = event.data.object as Stripe.Invoice;
    const subId    = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (subId) {
      await sql`
        UPDATE fp_subscripciones SET estado = 'vencida', updated_at = NOW()
        WHERE stripe_subscription_id = ${subId}
      `;
    }
  }

  // ──────────────────────────────────────────────────────────
  // invoice.payment_succeeded → renovación mensual exitosa
  // ──────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice  = event.data.object as Stripe.Invoice;
    const subId    = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (subId) {
      const nuevaFechaFin = new Date();
      nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
      await sql`
        UPDATE fp_subscripciones
        SET estado = 'activa', fecha_fin = ${nuevaFechaFin.toISOString()}, updated_at = NOW()
        WHERE stripe_subscription_id = ${subId}
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
