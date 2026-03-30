import { Html, Head, Body, Container, Section, Text, Button, Hr } from "@react-email/components";

interface TrialExpiraProps {
  nombreEmpresa: string;
  email: string;
  diasRestantes: number;
  plan: string;
  precioMensual: number;
}

export default function TrialExpira({ nombreEmpresa, email, diasRestantes, plan, precioMensual }: TrialExpiraProps) {
  const urgente = diasRestantes <= 1;
  const colorHeader = urgente ? "#ef4444" : "#f59e0b";
  const emoji = urgente ? "⚠️" : "⏰";

  return (
    <Html lang="es">
      <Head />
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden" }}>
          <Section style={{ backgroundColor: colorHeader, padding: "32px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: "22px", fontWeight: "bold", margin: 0 }}>
              {emoji} Tu trial termina {diasRestantes === 0 ? "hoy" : `en ${diasRestantes} día${diasRestantes > 1 ? "s" : ""}`}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px", margin: "8px 0 0" }}>
              FinancePro Chile — {nombreEmpresa}
            </Text>
          </Section>

          <Section style={{ padding: "32px 40px" }}>
            <Text style={{ color: "#475569", lineHeight: "1.6" }}>
              Tu período de prueba gratuita está por terminar. Para seguir accediendo a todos los
              módulos de FinancePro, activa tu plan <strong>{plan}</strong> por solo{" "}
              <strong>${precioMensual.toLocaleString("es-CL")} CLP/mes</strong>.
            </Text>

            <Text style={{ color: "#475569", lineHeight: "1.8", marginTop: "16px" }}>
              Lo que perderías al expirar:<br />
              ❌ Acceso al dashboard financiero<br />
              ❌ Cálculos de IVA y PPM<br />
              ❌ Historial de ingresos y gastos<br />
              ❌ FinanceBot (IA)
            </Text>

            <Button
              href="https://financepro-chile.netlify.app/mi-cuenta"
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
              Activar mi plan ahora →
            </Button>
          </Section>

          <Hr style={{ margin: "0", borderColor: "#e2e8f0" }} />
          <Section style={{ padding: "20px 40px" }}>
            <Text style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
              Este email fue enviado a {email}. FinancePro Chile · Valparaíso, Chile
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
