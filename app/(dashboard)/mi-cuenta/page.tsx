"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Crown, Clock, CheckCircle2, ArrowRight, CreditCard,
  Zap, AlertTriangle, Building2, RefreshCw, ExternalLink, Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Subscripcion {
  plan: string;
  estado: "trial" | "activa" | "cancelada" | "vencida" | "pausada";
  fecha_fin: string | null;
}

interface Empresa {
  id: string;
  nombre: string;
  rut: string;
  created_at: string;
}

const PLAN_INFO: Record<string, {
  nombre: string; precio: number; color: string; iconColor: string; features: string[];
}> = {
  starter: {
    nombre: "Starter",
    precio: 19990,
    color: "from-slate-700 to-slate-900",
    iconColor: "text-slate-300",
    features: ["Dashboard financiero", "IVA + PPM automático", "Fondo de emergencia", "1 usuario · 5 proyectos"],
  },
  professional: {
    nombre: "Professional",
    precio: 39990,
    color: "from-emerald-600 to-emerald-800",
    iconColor: "text-emerald-200",
    features: ["Todo el Starter", "Capital Humano", "OCR para boletas", "5 usuarios · 30 proyectos", "Soporte email"],
  },
  enterprise: {
    nombre: "Enterprise",
    precio: 79990,
    color: "from-violet-700 to-violet-900",
    iconColor: "text-violet-200",
    features: ["Todo el Professional", "Usuarios ilimitados", "API access", "Soporte WhatsApp", "Onboarding"],
  },
};

// Demo data cuando no hay Supabase
const DEMO_EMPRESA: Empresa = {
  id: "demo-empresa",
  nombre: "Mi Empresa Demo SpA",
  rut: "76.123.456-7",
  created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
};

const DEMO_SUB: Subscripcion = {
  plan: "professional",
  estado: "trial",
  fecha_fin: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
};

function diasRestantes(fecha: string | null): number {
  if (!fecha) return 0;
  const diff = new Date(fecha).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

export default function MiCuentaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sub, setSub] = useState<Subscripcion | null>(null);
  const [loading, setLoading] = useState(!isDemoMode);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null); // plan en proceso
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [suscExpired, setSuscExpired] = useState(false);
  const [cuentaBloqueada, setCuentaBloqueada] = useState(false);

  // Detectar params de Stripe, suscripción vencida o cuenta bloqueada
  useEffect(() => {
    if (searchParams.get("success") === "1") {
      setPagoExitoso(true);
      window.history.replaceState({}, "", "/mi-cuenta");
    }
    if (searchParams.get("expired") === "1") {
      setSuscExpired(true);
      window.history.replaceState({}, "", "/mi-cuenta");
    }
    if (searchParams.get("blocked") === "1") {
      setCuentaBloqueada(true);
      window.history.replaceState({}, "", "/mi-cuenta");
    }
  }, [searchParams]);

  /** Redirige a Stripe Checkout para el plan dado */
  const handleCheckout = useCallback(async (plan: string) => {
    setLoadingCheckout(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Error al iniciar el pago");
        setLoadingCheckout(null);
      }
    } catch {
      alert("Error de conexión al iniciar el pago");
      setLoadingCheckout(null);
    }
  }, []);

  /** Abre el Customer Portal de Stripe para gestionar suscripción */
  const handlePortal = useCallback(async () => {
    setLoadingPortal(true);
    try {
      const res  = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Error al abrir el portal de pagos");
        setLoadingPortal(false);
      }
    } catch {
      alert("Error de conexión");
      setLoadingPortal(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      if (isDemoMode) {
        setEmpresa(DEMO_EMPRESA);
        setSub(DEMO_SUB);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: emp } = await supabase
        .from("fp_empresas")
        .select("id, nombre, rut, created_at")
        .eq("user_id", user.id)
        .single();

      if (emp) {
        setEmpresa(emp);
        const { data: s } = await supabase
          .from("fp_subscripciones")
          .select("plan, estado, fecha_fin")
          .eq("empresa_id", emp.id)
          .single();
        if (s) setSub(s as Subscripcion);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Mi Cuenta" subtitle="Plan y facturación" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Cargando tu cuenta...</p>
          </div>
        </div>
      </div>
    );
  }

  const planId = sub?.plan ?? "professional";
  const plan = PLAN_INFO[planId] ?? PLAN_INFO.professional;
  const dias = sub?.estado === "trial" ? diasRestantes(sub.fecha_fin) : null;
  const esTrialBajo = dias !== null && dias <= 3;

  return (
    <div className="flex flex-col h-full">
      <Header title="Mi Cuenta" subtitle="Gestiona tu plan y facturación" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-3xl">

        {/* Banner cuenta bloqueada por admin */}
        {cuentaBloqueada && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-400 rounded-xl text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-rose-900">Cuenta bloqueada</p>
              <p className="text-rose-700 text-xs mt-0.5">
                Tu cuenta fue bloqueada por falta de pago. Activa un plan o contacta a soporte en{" "}
                <a href="mailto:hola@financepro.cl" className="underline font-medium">hola@financepro.cl</a>.
              </p>
            </div>
          </div>
        )}

        {/* Banner suscripción vencida */}
        {suscExpired && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Tu suscripción ha vencido</p>
              <p className="text-red-700 text-xs mt-0.5">
                Activa un plan para recuperar el acceso completo. Tus datos están intactos.
              </p>
            </div>
          </div>
        )}

        {/* Banner pago exitoso */}
        {pagoExitoso && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">¡Pago exitoso! Tu plan está activo 🎉</p>
              <p className="text-emerald-700 text-xs mt-0.5">Recibirás un email de confirmación en breve.</p>
            </div>
          </div>
        )}

        {/* Banner trial urgente */}
        {sub?.estado === "trial" && esTrialBajo && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">
                Tu prueba gratuita vence en {dias === 0 ? "menos de 24 horas" : `${dias} día${dias > 1 ? "s" : ""}`}
              </p>
              <p className="text-amber-700 text-xs mt-0.5">
                Para seguir usando FinancePro, activa tu plan. Tus datos se mantendrán intactos.
              </p>
            </div>
          </div>
        )}

        {/* Plan actual */}
        <Card className="overflow-hidden">
          <div className={cn("bg-gradient-to-r p-6 text-white", plan.color)}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className={cn("w-5 h-5", plan.iconColor)} />
                  <span className={cn("text-sm font-medium", plan.iconColor)}>Plan actual</span>
                </div>
                <h2 className="text-3xl font-bold">{plan.nombre}</h2>
                <p className="text-white/70 text-sm mt-1">{formatCLP(plan.precio)}/mes</p>
              </div>
              <div className="text-right">
                {sub?.estado === "trial" && (
                  <div className="bg-white/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-bold">{dias}</p>
                    <p className="text-xs text-white/80">días de trial</p>
                  </div>
                )}
                {sub?.estado === "activa" && (
                  <div className="bg-white/20 rounded-xl px-4 py-3 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs text-white/80">Activa</p>
                  </div>
                )}
              </div>
            </div>

            {/* Estado badge */}
            <div className="mt-4 flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full",
                sub?.estado === "trial" ? "bg-amber-400/20 text-amber-200" :
                  sub?.estado === "activa" ? "bg-green-400/20 text-green-200" :
                    "bg-red-400/20 text-red-200"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  sub?.estado === "trial" ? "bg-amber-300" :
                    sub?.estado === "activa" ? "bg-green-300" : "bg-red-300"
                )} />
                {sub?.estado === "trial"
                  ? `Trial gratuito · vence ${formatFecha(sub.fecha_fin)}`
                  : sub?.estado === "activa"
                    ? `Activa · próximo cobro ${formatFecha(sub?.fecha_fin)}`
                    : sub?.estado ?? "Desconocido"
                }
              </span>
            </div>
          </div>

          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-700 mb-3">Incluido en tu plan:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Upgrade / cambio de plan */}
        {(sub?.estado === "trial" || sub?.estado === "activa") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" /> Cambiar de plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(PLAN_INFO).map(([id, p]) => {
                  const isActual = id === planId;
                  return (
                    <div
                      key={id}
                      className={cn(
                        "border-2 rounded-xl p-4 transition-all",
                        isActual
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-slate-900 text-sm">{p.nombre}</p>
                        {isActual && (
                          <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-3">{formatCLP(p.precio)}<span className="text-xs text-slate-400 font-normal">/mes</span></p>
                      {isActual ? (
                        <p className="text-xs text-emerald-600 text-center font-medium">Plan activo ✓</p>
                      ) : (
                        <button
                          onClick={() => handleCheckout(id)}
                          disabled={loadingCheckout !== null}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 border border-emerald-600 rounded-lg py-2 transition-colors"
                        >
                          {loadingCheckout === id ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Procesando...</>
                          ) : (
                            <>{parseInt(p.precio.toString()) > plan.precio ? "⬆ Subir a" : "⬇ Bajar a"} {p.nombre}</>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">
                Pago seguro vía Stripe · Tarjetas nacionales e internacionales aceptadas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trial vencido / Pagar */}
        {(sub?.estado === "trial" || sub?.estado === "vencida") && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    {sub?.estado === "trial" ? "Activa tu plan para no perder acceso" : "Reactiva tu cuenta"}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Pago seguro con tarjeta vía Stripe. Factura electrónica disponible.
                  </p>
                </div>
                <button
                  onClick={() => handleCheckout(planId)}
                  disabled={loadingCheckout !== null}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
                >
                  {loadingCheckout === planId ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</>
                  ) : (
                    <>Activar plan <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gestionar suscripción activa (Stripe Portal) */}
        {sub?.estado === "activa" && (
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-slate-500" />
                    Gestionar suscripción
                  </h3>
                  <p className="text-sm text-slate-500">
                    Cambia de plan, actualiza tu tarjeta o cancela cuando quieras.
                  </p>
                </div>
                <button
                  onClick={handlePortal}
                  disabled={loadingPortal}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
                >
                  {loadingPortal ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</>
                  ) : (
                    <>Portal de pagos <ExternalLink className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Datos empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600" /> Datos de la empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {empresa ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Empresa</p>
                  <p className="font-semibold text-slate-900">{empresa.nombre}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">RUT</p>
                  <p className="font-semibold text-slate-900">{empresa.rut}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Cliente desde</p>
                  <p className="font-semibold text-slate-900">{formatFecha(empresa.created_at)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">ID empresa</p>
                  <p className="font-mono text-xs text-slate-500 truncate">{empresa.id.slice(0, 16)}…</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No hay datos de empresa disponibles.</p>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link href="/configuracion" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                Editar datos de empresa <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Historial de pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-600" /> Historial de pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sub?.estado === "trial" ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Estás en período de prueba gratuita</p>
                <p className="text-slate-400 text-xs mt-1">
                  El primer cobro ocurrirá al activar tu plan el {formatFecha(sub.fecha_fin)}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No hay pagos registrados aún</p>
                <p className="text-slate-400 text-xs mt-1">Los comprobantes aparecerán aquí una vez activado el plan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Soporte */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="text-2xl">💬</div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">¿Tienes alguna pregunta?</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Escríbenos y te respondemos en menos de 24 horas hábiles.
                </p>
              </div>
              <a
                href="mailto:hola@financepro.cl"
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-300 rounded-lg px-3 py-2 hover:bg-emerald-50 transition-colors"
              >
                Contactar <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>

        {isDemoMode && (
          <div className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            🚧 Modo demo · Datos simulados. Conecta Supabase en <code className="bg-amber-100 px-1 rounded">.env.local</code> para datos reales.
          </div>
        )}
      </div>
    </div>
  );
}
