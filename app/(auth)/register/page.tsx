"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Loader2, AlertCircle, CheckCircle2, ArrowRight,
} from "lucide-react";

const PLANES = [
  {
    id: "starter",
    nombre: "Starter",
    precio: 19990,
    desc: "Freelancers y emprendedores individuales",
    cardBorder: "border-slate-200 hover:border-slate-400",
    selectedBorder: "border-slate-800 ring-2 ring-slate-800 bg-slate-50",
    badge: null,
    features: [
      "Dashboard financiero completo",
      "IVA + PPM automático (SII)",
      "Fondo de emergencia",
      "1 usuario · 5 proyectos",
    ],
  },
  {
    id: "professional",
    nombre: "Professional",
    precio: 39990,
    desc: "Pymes y equipos que necesitan control total",
    cardBorder: "border-emerald-200 hover:border-emerald-500",
    selectedBorder: "border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50",
    badge: "⭐ Más popular",
    features: [
      "Todo el Starter",
      "Capital Humano y liquidaciones",
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
    desc: "Empresas con equipos grandes y necesidades avanzadas",
    cardBorder: "border-slate-200 hover:border-slate-400",
    selectedBorder: "border-slate-800 ring-2 ring-slate-800 bg-slate-50",
    badge: null,
    features: [
      "Todo el Professional",
      "Usuarios y proyectos ilimitados",
      "Acceso a API",
      "Soporte prioritario WhatsApp",
      "Onboarding personalizado",
    ],
  },
];

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") ?? "professional";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [form, setForm] = useState({
    email: "", password: "", nombre: "", rut: "", giro: "", regimen: "pro_pyme_general",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  const planActual = PLANES.find(p => p.id === selectedPlan) ?? PLANES[1];

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      // Modo demo: simular éxito
      await new Promise(r => setTimeout(r, 1500));
      setStep(3);
      setLoading(false);
      return;
    }

    try {
      // STEP 1: Create user + empresa via API (server uses service_role, bypasses RLS/schema issues)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nombre: form.nombre,
          rut: form.rut,
          giro: form.giro || null,
          regimen: form.regimen,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Error al crear la cuenta. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      // STEP 2: Sign in to establish session (user was created server-side)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) {
        setError("Cuenta creada. Por favor inicia sesión manualmente.");
        setLoading(false);
        return;
      }

      // STEP 3: Update plan if not professional
      if (selectedPlan !== "professional" && data.empresaId) {
        await supabase
          .from("fp_subscripciones")
          .update({ plan: selectedPlan })
          .eq("empresa_id", data.empresaId);
      }

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  /* ── STEP 3: Éxito ── */
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Bienvenido a FinancePro!</h2>
          <p className="text-slate-500 mb-5">
            Tu trial de <strong className="text-slate-900">14 días gratis</strong> del plan{" "}
            <span className="font-bold text-emerald-600">{planActual.nombre}</span> está activo.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
            <p className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              Sin tarjeta de crédito requerida
            </p>
            <p className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              Acceso completo a todos los módulos por 14 días
            </p>
            <p className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              Cancela cuando quieras, sin compromisos
            </p>
          </div>

          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push("/dashboard")}>
            Ir al Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {isDemoMode && (
            <p className="text-xs text-amber-600 mt-4 bg-amber-50 rounded-lg p-2">
              🚧 Modo demo activo — configura Supabase en <code>.env.local</code> para guardar datos reales
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4 py-10">
      <div className={cn("w-full transition-all", step === 1 ? "max-w-3xl" : "max-w-md")}>

        {/* Logo + título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-2xl mb-4 shadow-lg">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FinancePro Chile</h1>
          <p className="text-slate-400 mt-1 text-sm">14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["Elige tu plan", "Crea tu cuenta"].map((label, i) => {
            const n = i + 1;
            const active = step >= n;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                  active ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50"
                )}>
                  <span>{n}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < 1 && <div className={cn("w-8 h-0.5 transition-colors", step > n ? "bg-emerald-500" : "bg-white/20")} />}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Selección de plan ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANES.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    "bg-white rounded-2xl border-2 p-6 text-left relative transition-all hover:shadow-lg cursor-pointer",
                    selectedPlan === plan.id ? plan.selectedBorder : plan.cardBorder
                  )}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{plan.nombre}</h3>
                      <p className="text-slate-400 text-xs mt-0.5 leading-snug">{plan.desc}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                      selectedPlan === plan.id
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-300 bg-white"
                    )}>
                      {selectedPlan === plan.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-bold text-slate-900">{formatCLP(plan.precio)}</span>
                    <span className="text-slate-400 text-xs">/mes</span>
                    <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">14 días gratis</p>
                  </div>

                  <ul className="space-y-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={() => setStep(2)}
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-10 shadow-lg shadow-emerald-500/30"
              >
                Continuar con {planActual.nombre} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-white/40 text-xs mt-3">Puedes cambiar de plan en cualquier momento desde tu cuenta</p>
            </div>

            <p className="text-center text-sm text-slate-400">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-emerald-400 hover:underline font-medium">Ingresar</Link>
            </p>
          </div>
        )}

        {/* ── STEP 2: Formulario de cuenta ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">

            {/* Plan elegido */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900">
                  Plan <span className="text-emerald-600">{planActual.nombre}</span> · {formatCLP(planActual.precio)}/mes
                </p>
                <p className="text-xs text-emerald-700">14 días gratis, sin tarjeta de crédito</p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-emerald-600 hover:underline font-medium flex-shrink-0"
              >
                Cambiar
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@empresa.cl"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Nombre de la empresa</Label>
                <Input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Mi Empresa SpA"
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>RUT empresa</Label>
                  <Input
                    value={form.rut}
                    onChange={e => setForm({ ...form, rut: e.target.value })}
                    placeholder="76.XXX.XXX-X"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Giro</Label>
                  <Input
                    value={form.giro}
                    onChange={e => setForm({ ...form, giro: e.target.value })}
                    placeholder="Desarrollo de software"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Régimen tributario</Label>
                <select
                  value={form.regimen}
                  onChange={e => setForm({ ...form, regimen: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="pro_pyme_general">Pro Pyme General — Impuesto 25%</option>
                  <option value="pro_pyme_transparente">Pro Pyme Transparente — Tributación al socio</option>
                  <option value="general">Régimen General — Impuesto 27%</option>
                </select>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando tu cuenta...</>
                  : <>Activar prueba gratuita <ArrowRight className="w-4 h-4 ml-1" /></>
                }
              </Button>

              <p className="text-xs text-center text-slate-400">
                Al registrarte aceptas nuestros{" "}
                <a href="#" className="underline hover:text-slate-600">Términos de Servicio</a>{" "}
                y{" "}
                <a href="#" className="underline hover:text-slate-600">Política de Privacidad</a>.
              </p>
            </form>

            <p className="text-center text-sm text-slate-500 mt-4">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-emerald-600 hover:underline font-medium">Ingresar</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Cargando...</p>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
