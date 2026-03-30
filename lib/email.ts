/**
 * Módulo de emails transaccionales con Resend
 * Usa React Email para templates HTML limpios y responsivos.
 */
import { Resend } from "resend";
import { render } from "@react-email/render";
import BienvenidaEmail from "@/emails/bienvenida";
import TrialExpiraEmail from "@/emails/trial-expira";
import PagoConfirmadoEmail from "@/emails/pago-confirmado";

// El remitente usa el dominio compartido de Resend si no hay dominio propio configurado
const FROM = process.env.EMAIL_FROM ?? "FinancePro Chile <onboarding@resend.dev>";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no está configurada");
  return new Resend(key);
}

// ── Bienvenida tras el registro ───────────────────────────────
export async function sendBienvenida(
  email: string,
  opts: { nombreEmpresa: string; plan?: string; diasTrial?: number }
) {
  try {
    const resend = getResend();
    const html = await render(
      BienvenidaEmail({
        email,
        nombreEmpresa: opts.nombreEmpresa,
        plan: opts.plan ?? "professional",
        diasTrial: opts.diasTrial ?? 14,
      })
    );
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `¡Bienvenido a FinancePro Chile, ${opts.nombreEmpresa}! 🚀`,
      html,
    });
  } catch (err) {
    // No bloquear el flujo principal si el email falla
    console.error("[email] sendBienvenida error:", err);
  }
}

// ── Recordatorio de trial por expirar ───────────────────────
export async function sendTrialExpira(
  email: string,
  opts: { nombreEmpresa: string; diasRestantes: number; plan: string; precioMensual: number }
) {
  try {
    const resend = getResend();
    const html = await render(TrialExpiraEmail({ email, ...opts }));
    const diasStr = opts.diasRestantes === 0 ? "hoy" : `en ${opts.diasRestantes} día(s)`;
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `⏰ Tu trial de FinancePro expira ${diasStr}`,
      html,
    });
  } catch (err) {
    console.error("[email] sendTrialExpira error:", err);
  }
}

// ── Confirmación de pago exitoso ─────────────────────────────
export async function sendPagoConfirmado(
  email: string,
  opts: { plan: string; fechaFin: string }
) {
  try {
    const resend = getResend();
    const html = await render(PagoConfirmadoEmail({ email, ...opts }));
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "✅ Pago confirmado — FinancePro Chile",
      html,
    });
  } catch (err) {
    console.error("[email] sendPagoConfirmado error:", err);
  }
}
