/**
 * Cliente Stripe singleton para FinancePro Chile.
 * La validación de la key es lazy (solo cuando se usa, no en build).
 */
import Stripe from "stripe";

// Lazy singleton — se crea la primera vez que se llama getStripe()
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada en las variables de entorno.");
    _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia", typescript: true });
  }
  return _stripe;
}

// Alias conveniente para uso directo
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

/** Mapa plan_id → Stripe Price ID (desde variables de entorno) */
export const STRIPE_PRICES: Record<string, string> = {
  starter:      process.env.STRIPE_PRICE_ID_STARTER      ?? "",
  professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL ?? "",
  enterprise:   process.env.STRIPE_PRICE_ID_ENTERPRISE   ?? "",
};

/** Precios en CLP para mostrar en UI */
export const PLAN_PRECIOS: Record<string, number> = {
  starter:      19990,
  professional: 39990,
  enterprise:   79990,
};

export function isPlanValido(plan: string): boolean {
  return ["starter", "professional", "enterprise"].includes(plan);
}
