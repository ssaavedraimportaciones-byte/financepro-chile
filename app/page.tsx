import Link from "next/link";
import {
  TrendingUp, CheckCircle2, ArrowRight, Receipt, Users, FolderKanban,
  ScanLine, PiggyBank, Shield, Zap, BarChart3, Clock
} from "lucide-react";

const PLANES = [
  {
    id: "starter",
    nombre: "Starter",
    precio: 19990,
    precioAnual: 199990,
    descripcion: "Ideal para freelancers y emprendedores individuales",
    color: "border-slate-200",
    btnColor: "bg-slate-800 hover:bg-slate-700",
    badge: null,
    features: [
      "Dashboard financiero completo",
      "Registro de ingresos y gastos",
      "Calculadora IVA + PPM (SII)",
      "Fondo de emergencia",
      "1 usuario · 5 proyectos",
    ],
  },
  {
    id: "professional",
    nombre: "Professional",
    precio: 39990,
    precioAnual: 399990,
    descripcion: "Para Pymes y equipos que necesitan control total",
    color: "border-emerald-500 ring-2 ring-emerald-500",
    btnColor: "bg-emerald-600 hover:bg-emerald-700",
    badge: "⭐ Más popular",
    features: [
      "Todo lo del Starter",
      "Capital Humano y liquidaciones",
      "Centro de costos por proyecto",
      "OCR para boletas y facturas",
      "Valor hora del fundador",
      "5 usuarios · 30 proyectos",
      "Soporte por email",
    ],
  },
  {
    id: "enterprise",
    nombre: "Enterprise",
    precio: 79990,
    precioAnual: 799990,
    descripcion: "Para empresas con equipos grandes y necesidades avanzadas",
    color: "border-slate-200",
    btnColor: "bg-slate-800 hover:bg-slate-700",
    badge: null,
    features: [
      "Todo lo del Professional",
      "Usuarios y proyectos ilimitados",
      "Acceso a API",
      "Soporte prioritario WhatsApp",
      "Onboarding personalizado",
      "Exportación de reportes",
    ],
  },
];

const FEATURES = [
  { icon: BarChart3,  title: "Dashboard en tiempo real",      desc: "KPIs financieros, burn rate, runway y cashflow de un vistazo." },
  { icon: Receipt,    title: "Tributario SII automatizado",    desc: "IVA, PPM, impuesto a la renta. Cálculos exactos según tu régimen." },
  { icon: Users,      title: "Gestión de Capital Humano",     desc: "Liquidaciones, cotizaciones AFP/Fonasa, cálculo honorarios 13.75%." },
  { icon: FolderKanban, title: "Rentabilidad por proyecto",   desc: "Sabe exactamente cuánto ganas (o pierdes) en cada proyecto." },
  { icon: ScanLine,   title: "OCR para boletas",              desc: "Saca foto a tu boleta y el sistema extrae fecha, monto y comercio solo." },
  { icon: Zap,        title: "Gastos hormiga detectados",     desc: "Alerta automática cuando categorías pequeñas se comen tu margen." },
  { icon: Clock,      title: "Valor hora del fundador",       desc: "Cuantifica el costo real de tu tiempo con multiplicador de riesgo." },
  { icon: PiggyBank,  title: "Fondo de emergencia",           desc: "Reserva automática para cubrir IVA, imprevistos o meses malos." },
];

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">FP</div>
            <span className="font-bold text-slate-900 text-lg">FinancePro Chile</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Funciones</a>
            <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Ingresar
            </Link>
            <Link href="/register" className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              Prueba gratis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-sm px-4 py-1.5 rounded-full mb-6 border border-emerald-500/30">
            🇨🇱 Diseñado para Pymes y startups chilenas
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            El CFO que tu empresa<br />
            <span className="text-emerald-400">no puede pagar</span>, pero necesita
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Dashboard financiero completo con cálculo automático de IVA, PPM, liquidaciones,
            rentabilidad por proyecto y detección de fugas de dinero. Todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?plan=professional" className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-emerald-500/30">
              Comenzar prueba gratis 14 días <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#precios" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors border border-white/20">
              Ver precios
            </Link>
          </div>
          <p className="text-slate-400 text-sm mt-4">Sin tarjeta de crédito · Sin contrato · Cancela cuando quieras</p>
        </div>

        {/* Métricas sociales */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-3 gap-6 border-t border-white/10 pt-12">
          {[
            { n: "100%", label: "Normativa SII Chile" },
            { n: "14 días", label: "Trial gratuito" },
            { n: "0$", label: "Sin costo de setup" },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-3xl font-bold text-emerald-400">{m.n}</p>
              <p className="text-slate-400 text-sm mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Todo lo que necesitas para controlar tu empresa</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              8 módulos especializados, calculados con la normativa tributaria chilena vigente.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                  <Icon className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Precios simples y transparentes</h2>
            <p className="text-xl text-slate-500">Todos los planes incluyen 14 días de prueba gratis. Sin compromisos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {PLANES.map(plan => (
              <div key={plan.id} className={`bg-white rounded-2xl border-2 p-8 relative ${plan.color}`}>
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.nombre}</h3>
                <p className="text-slate-500 text-sm mb-6">{plan.descripcion}</p>
                <div className="mb-1">
                  <span className="text-4xl font-bold text-slate-900">{formatCLP(plan.precio)}</span>
                  <span className="text-slate-400 text-sm">/mes</span>
                </div>
                <p className="text-xs text-emerald-600 mb-6">o {formatCLP(plan.precioAnual)}/año — ahorra 2 meses</p>
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={`block w-full text-center text-white font-semibold py-3 rounded-xl transition-colors mb-6 ${plan.btnColor}`}
                >
                  Empezar gratis
                </Link>
                <ul className="space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">
            💳 Pago vía Transbank o transferencia bancaria · Factura electrónica disponible
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {[
              { q: "¿Necesito conocimientos contables para usar FinancePro?", a: "No. La app fue diseñada para fundadores y dueños de empresa, no para contadores. Los cálculos se hacen automáticamente." },
              { q: "¿Los cálculos tributarios son correctos para Chile?", a: "Sí. IVA 19%, PPM 1% Pro Pyme, retención honorarios 13.75%, cotizaciones previsionales vigentes 2024-2025. Siempre recomendamos validar con tu contador." },
              { q: "¿Mis datos están seguros?", a: "Sí. Usamos Supabase con Row Level Security (RLS): cada empresa solo puede ver sus propios datos. Nunca accedemos a tu información financiera." },
              { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Sin contratos ni penalidades. Cancelas desde la plataforma o escribiéndonos, efectivo al fin del período facturado." },
              { q: "¿Reemplaza a mi contador?", a: "No. FinancePro es un complemento: te ayuda a tener claridad diaria de tus finanzas y llegar mejor preparado a reunirte con tu contador." },
              { q: "¿Qué pasa después del trial de 14 días?", a: "Te pedimos que elijas un plan. Si no, tu cuenta pasa a modo lectura (no puedes ingresar nuevos datos). Nunca borramos tu información." },
            ].map(({ q, a }) => (
              <details key={q} className="bg-white border border-slate-200 rounded-xl p-5 group cursor-pointer">
                <summary className="font-semibold text-slate-900 list-none flex justify-between items-center">
                  {q}
                  <span className="text-emerald-500 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 bg-gradient-to-r from-emerald-600 to-emerald-800">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">¿Listo para tener control real de tus finanzas?</h2>
          <p className="text-emerald-100 text-xl mb-8">14 días gratis, sin tarjeta de crédito. Cancela cuando quieras.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-10 py-4 rounded-xl text-lg hover:bg-emerald-50 transition-colors shadow-xl">
            Crear cuenta gratis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white text-xs">FP</div>
            <span className="text-white font-semibold">FinancePro Chile</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-white transition-colors">Ingresar</Link>
            <Link href="/register" className="hover:text-white transition-colors">Registrarse</Link>
            <a href="mailto:hola@financepro.cl" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <p>© 2026 FinancePro Chile · Hecho con 🇨🇱 en Valparaíso</p>
        </div>
      </footer>
    </div>
  );
}
