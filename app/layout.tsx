import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinancePro Chile - Dashboard Financiero",
  description: "Gestión financiera y tributaria para startups y Pymes chilenas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>{children}</body>
    </html>
  );
}
