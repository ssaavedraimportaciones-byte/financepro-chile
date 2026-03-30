"use client";
import { useEffect, useState } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { IngresosGastosChart } from "@/components/charts/ingresos-gastos-chart";
import { DistribucionCostosChart } from "@/components/charts/distribucion-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP, formatPorcentaje, getUltimosMeses, nombreMes } from "@/lib/formatters";
import { calcularKPIs, calcularIVA, calcularPPM, detectarGastosHormiga } from "@/lib/calculations";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt,
  AlertTriangle, Clock, Flame, Zap
} from "lucide-react";

interface DashboardData {
  userEmail: string | null;
  empresa: { nombre: string; regimen_tributario: string } | null;
  ingresosMes: number;
  gastosMes: number;
  ingresosConFactura: number;
  gastosConFactura: number;
  evolucion: Array<{ mes: string; ingresos: number; gastos: number; utilidad: number }>;
  distribucion: Array<{ categoria: string; monto: number }>;
  cashDisponible: number;
}

const DEMO_DATA: DashboardData = {
  userEmail: "demo@financepro.cl",
  empresa: { nombre: "Demo SpA", regimen_tributario: "pro_pyme_general" },
  ingresosMes: 4500000,
  gastosMes: 2800000,
  ingresosConFactura: 3800000,
  gastosConFactura: 1900000,
  cashDisponible: 12000000,
  evolucion: getUltimosMeses(6).map((m, i) => ({
    mes: nombreMes(m),
    ingresos: 3000000 + i * 300000 + Math.random() * 500000,
    gastos: 2000000 + i * 100000 + Math.random() * 300000,
    utilidad: 1000000 + i * 200000,
  })),
  distribucion: [
    { categoria: "capital_humano", monto: 1200000 },
    { categoria: "tecnologia",     monto: 450000 },
    { categoria: "operativo",      monto: 380000 },
    { categoria: "marketing",      monto: 320000 },
    { categoria: "arriendo",       monto: 280000 },
    { categoria: "otro",           monto: 170000 },
  ],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(DEMO_DATA);
  const [loading, setLoading] = useState(!isDemoMode);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      if (isDemoMode) { setLoading(false); return; }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: empresa, error: empresaError } = await supabase
          .from("fp_empresas").select("*").eq("user_id", user.id).maybeSingle();

        if (empresaError || !empresa) {
          setData((prev) => ({
            ...prev,
            userEmail: user.email ?? null,
            empresa: null,
          }));
          setLoading(false);
          return;
        }

        const mesActual = new Date().toISOString().slice(0, 7);
        const fechaInicio = `${mesActual}-01`;
        const fechaFin = new Date().toISOString().slice(0, 10);

        // Ingresos del mes
        const { data: ingresos } = await supabase
          .from("fp_ingresos")
          .select("monto, monto_iva, fecha")
          .eq("empresa_id", empresa.id)
          .gte("fecha", fechaInicio).lte("fecha", fechaFin);

        // Gastos del mes
        const { data: gastos } = await supabase
          .from("fp_gastos")
          .select("monto, monto_iva, categoria, fecha")
          .eq("empresa_id", empresa.id)
          .gte("fecha", fechaInicio).lte("fecha", fechaFin);

        const ingresosMes = (ingresos ?? []).reduce((s, r) => s + r.monto, 0);
        const gastosMes = (gastos ?? []).reduce((s, r) => s + r.monto, 0);
        const ingresosConFactura = (ingresos ?? []).filter(r => r.monto_iva > 0).reduce((s, r) => s + r.monto, 0);
        const gastosConFactura = (gastos ?? []).filter(r => r.monto_iva > 0).reduce((s, r) => s + r.monto, 0);

        // Evolución últimos 6 meses
        const meses = getUltimosMeses(6);
        const evolucion = await Promise.all(meses.map(async (m) => {
          const [y, mo] = m.split("-");
          const fi = `${m}-01`;
          const lastDay = new Date(+y, +mo, 0).getDate();
          const ff = `${m}-${lastDay}`;
          const [{ data: ing }, { data: gas }] = await Promise.all([
            supabase.from("fp_ingresos").select("monto").eq("empresa_id", empresa.id).gte("fecha", fi).lte("fecha", ff),
            supabase.from("fp_gastos").select("monto").eq("empresa_id", empresa.id).gte("fecha", fi).lte("fecha", ff),
          ]);
          const i = (ing ?? []).reduce((s, r) => s + r.monto, 0);
          const g = (gas ?? []).reduce((s, r) => s + r.monto, 0);
          return { mes: nombreMes(m), ingresos: i, gastos: g, utilidad: i - g };
        }));

        // Distribución por categoría
        const distribMap: Record<string, number> = {};
        (gastos ?? []).forEach(g => {
          distribMap[g.categoria] = (distribMap[g.categoria] ?? 0) + g.monto;
        });
        const distribucion = Object.entries(distribMap).map(([categoria, monto]) => ({ categoria, monto }));

        setData({
          userEmail: user.email ?? null,
          empresa: { nombre: empresa.nombre, regimen_tributario: empresa.regimen_tributario },
          ingresosMes, gastosMes, ingresosConFactura, gastosConFactura,
          cashDisponible: ingresosMes * 2.5, // simplificado
          evolucion,
          distribucion: distribucion.length > 0 ? distribucion : DEMO_DATA.distribucion,
        });
      } catch (err) {
        setData((prev) => ({ ...prev, userEmail: null, empresa: null }));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const kpis = calcularKPIs({
    ingresos_mes: data.ingresosMes,
    gastos_mes: data.gastosMes,
    cash_disponible: data.cashDisponible,
    ingresos_con_factura: data.ingresosConFactura,
    gastos_con_factura: data.gastosConFactura,
    regimen: (data.empresa?.regimen_tributario as "pro_pyme_general" | "pro_pyme_transparente" | "general") ?? "pro_pyme_general",
  });

  const totalGastos = data.distribucion.reduce((s, d) => s + d.monto, 0);
  const gastosHormiga = detectarGastosHormiga(data.distribucion, totalGastos);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  if (!data.empresa && data.userEmail) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title="Bienvenido 👋"
          subtitle={data.userEmail}
        />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Empresa no encontrada</h2>
            <p className="text-slate-500 text-sm mb-4">
              Tu cuenta está creada pero no tiene una empresa asociada. Completa el registro o contacta soporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Bienvenido, ${data.empresa?.nombre ?? "Empresa"} 👋`}
        subtitle={
          data.userEmail
            ? `${data.userEmail} · Resumen financiero del mes actual`
            : "Resumen financiero del mes actual"
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* KPIs principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Ingresos del Mes" value={formatCLP(kpis.ingresos_mes)} icon={TrendingUp} color="green" change="vs mes anterior" changeType="up" />
          <KpiCard title="Gastos del Mes" value={formatCLP(kpis.gastos_mes)} icon={TrendingDown} color="red" change="Incluye todos los costos" />
          <KpiCard title="Utilidad Real" value={formatCLP(kpis.utilidad_mes)} icon={DollarSign} color={kpis.utilidad_mes >= 0 ? "green" : "red"} change={formatPorcentaje(kpis.ingresos_mes > 0 ? (kpis.utilidad_mes/kpis.ingresos_mes)*100 : 0) + " margen"} changeType={kpis.utilidad_mes >= 0 ? "up" : "down"} />
          <KpiCard title="Cashflow Neto" value={formatCLP(kpis.cashflow)} icon={Zap} color="blue" subtitle="Después de impuestos" />
        </div>

        {/* KPIs tributarios */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="IVA Proyectado" value={formatCLP(kpis.iva_proyectado)} icon={Receipt} color="orange" subtitle="A pagar al SII" />
          <KpiCard title="PPM Estimado" value={formatCLP(kpis.ppm_proyectado)} icon={Receipt} color="purple" subtitle="Pago provisional mensual" />
          <KpiCard title="Burn Rate" value={formatCLP(kpis.burn_rate)} icon={Flame} color="red" subtitle="Gasto mensual promedio" />
          <KpiCard title="Runway" value={`${kpis.runway_meses} meses`} icon={Clock} color={kpis.runway_meses < 3 ? "red" : "green"} subtitle="Con fondos actuales" />
        </div>

        {/* Alertas de gastos hormiga */}
        {gastosHormiga.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">⚠️ Gastos Hormiga Detectados</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {gastosHormiga.map(g => (
                <span key={g.categoria} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">
                  {g.categoria}: {formatCLP(g.monto)} ({formatPorcentaje(g.porcentaje)})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Ingresos vs Gastos (últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <IngresosGastosChart data={data.evolucion} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución de Costos</CardTitle>
            </CardHeader>
            <CardContent>
              <DistribucionCostosChart data={data.distribucion} />
            </CardContent>
          </Card>
        </div>

        {/* Tabla resumen tributario del mes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Resumen Tributario del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: "IVA Débito Fiscal", value: formatCLP(data.ingresosConFactura * 0.19), desc: "19% de ventas con factura" },
                { label: "IVA Crédito Fiscal", value: formatCLP(data.gastosConFactura * 0.19), desc: "19% de compras con factura" },
                { label: "IVA Neto a Pagar", value: formatCLP(kpis.iva_proyectado), desc: "Débito - Crédito" },
                { label: "PPM a Pagar", value: formatCLP(kpis.ppm_proyectado), desc: "1% de ventas del mes" },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs">{item.label}</p>
                  <p className="text-lg font-bold text-slate-900">{item.value}</p>
                  <p className="text-slate-400 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
