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
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency check: prevent duplicate processing of the same webhook event
  try {
    const existingEvent = await sql`SELECT id FROM fp_webhook_events WHERE stripe_event_id = ${event.id}`;
    if (existingEvent.length > 0) {
      console.log(`[webhook] Event ${event.id} already processed (idempotent)`);
      return NextResponse.json({ ok: true });
    }
    // Record this event as processed
    await sql`INSERT INTO fp_webhook_events (stripe_event_id, event_type, processed_at) VALUES (${event.id}, ${event.type}, NOW())`;
  } catch (idempotencyErr) {
    console.warn("[webhook] Idempotency check failed:", idempotencyErr);
    // Continue processing even if idempotency tracking fails
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
        INSERT INTO fp_subscripciones (empresa_id, plan, estado, fecha_vencimiento, stripe_customer_id, stripe_subscription_id)
        VALUES (${empresaId}, ${plan}, 'activa', ${fechaFin.toISOString()}, ${customerId}, ${subscriptionId})
        ON CONFLICT (empresa_id)
        DO UPDATE SET
          plan                    = ${plan},
          estado                  = 'activa',
          fecha_vencimiento       = ${fechaFin.toISOString()},
          stripe_customer_id      = ${customerId},
          stripe_subscription_id  = ${subscriptionId}
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
        SET estado = 'activa', fecha_vencimiento = ${nuevaFechaFin.toISOString()}
        WHERE stripe_subscription_id = ${subId}
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
