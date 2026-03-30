import { Html, Head, Body, Container, Section, Text, Button, Hr } from "@react-email/components";

interface PagoConfirmadoProps {
  email: string;
  plan: string;
  fechaFin: string;
}

const PLAN_NOMBRE: Record<string, string> = {
  starter: "Starter", professional: "Professional", enterprise: "Enterprise",
};
const PLAN_PRECIO: Record<string, number> = {
  starter: 19990, professional: 39990, enterprise: 79990,
};

export default function PagoConfirmado({ email, plan, fechaFin }: PagoConfirmadoProps) {
  return (
    <Html lang="es">
      <Head />
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden" }}>
          <Section style={{ backgroundColor: "#10b981", padding: "32px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: "22px", fontWeight: "bold", margin: 0 }}>
              ✅ Pago confirmado
            </Text>
            <Text style={{ color: "#d1fae5", fontSize: "14px", margin: "8px 0 0" }}>
              FinancePro Chile — Plan {PLAN_NOMBRE[plan] ?? plan}
            </Text>
          </Section>

          <Section style={{ padding: "32px 40px" }}>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              ¡Tu pago fue procesado exitosamente! Tu suscripción está activa hasta el{" "}
              <strong>{fechaFin}</strong>.
            </Text>

            {/* Resumen del cobro */}
            <Section style={{ backgroundColor: "#f1fdf7", borderRadius: "8px", padding: "16px 20px", marginTop: "20px" }}>
              <Text style={{ margin: "0 0 8px", fontWeight: "bold", color: "#065f46" }}>Resumen del cobro</Text>
              <Text style={{ margin: "4px 0", color: "#047857" }}>
                Plan: FinancePro {PLAN_NOMBRE[plan] ?? plan}
              </Text>
              <Text style={{ margin: "4px 0", color: "#047857" }}>
                Monto: ${(PLAN_PRECIO[plan] ?? 0).toLocaleString("es-CL")} CLP / mes
              </Text>
              <Text style={{ margin: "4px 0", color: "#047857" }}>
                Próximo cobro: {fechaFin}
              </Text>
            </Section>

            <Button
              href="https://financepro-chile.netlify.app/dashboard"
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "14px 28px",
                borderRadius: "8px",
                fontWeight: "bold",
                display: "inline-block",
                marginTop: "24px",
                textDecoration: "none",
              }}
            >
              Ir al Dashboard →
            </Button>
          </Section>

          <Hr style={{ margin: "0", borderColor: "#e2e8f0" }} />
          <Section style={{ padding: "20px 40px" }}>
            <Text style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
              {email} · Para cancelar o cambiar plan, ve a Mi Cuenta → Gestionar suscripción.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
