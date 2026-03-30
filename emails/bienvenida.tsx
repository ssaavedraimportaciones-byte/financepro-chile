import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Img,
} from "@react-email/components";

interface BienvenidaProps {
  nombreEmpresa: string;
  email: string;
  plan: string;
  diasTrial: number;
}

const PLAN_NOMBRE: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function Bienvenida({ nombreEmpresa, email, plan = "professional", diasTrial = 14 }: BienvenidaProps) {
  return (
    <Html lang="es">
      <Head />
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden" }}>

          {/* Header esmeralda */}
          <Section style={{ backgroundColor: "#10b981", padding: "32px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: "24px", fontWeight: "bold", margin: 0 }}>
              💚 FinancePro Chile
            </Text>
            <Text style={{ color: "#d1fae5", fontSize: "14px", margin: "8px 0 0" }}>
              Tu CFO digital está listo
            </Text>
          </Section>

          {/* Contenido */}
          <Section style={{ padding: "32px 40px" }}>
            <Text style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>
              ¡Bienvenido/a, {nombreEmpresa}! 🎉
            </Text>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Tu cuenta en FinancePro Chile está activa. Tienes <strong>{diasTrial} días gratis</strong> del
              plan <strong>{PLAN_NOMBRE[plan] ?? plan}</strong> para explorar todo sin límites.
            </Text>

            <Text style={{ fontWeight: "bold", color: "#0f172a", marginTop: "24px" }}>
              ¿Qué puedes hacer ahora?
            </Text>
            <Text style={{ color: "#475569", lineHeight: "1.8" }}>
              ✅ Registrar tus ingresos y gastos<br />
              ✅ Calcular tu IVA y PPM automáticamente<br />
              ✅ Ver la rentabilidad de cada proyecto<br />
              ✅ Preguntarle a tu FinanceBot (IA)
            </Text>

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

          {/* Footer */}
          <Section style={{ padding: "24px 40px" }}>
            <Text style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
              Este email fue enviado a {email}.<br />
              FinancePro Chile · Valparaíso, Chile
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
