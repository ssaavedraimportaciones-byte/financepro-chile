"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCLP, formatPorcentaje, getMesActual } from "@/lib/formatters";
import { calcularRunwayFondo, calcularAporteFondo } from "@/lib/calculations";
import { PiggyBank, Target, TrendingUp, Shield, Save } from "lucide-react";

export default function FondoEmergenciaPage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [fondoId, setFondoId] = useState<string | null>(null);
  const [config, setConfig] = useState({ porcentaje_ahorro: 5, meta: 6000000 });
  const [acumulado, setAcumulado] = useState(0);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [gastosMes, setGastosMes] = useState(0);
  const [depositar, setDepositar] = useState("");
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (isDemoMode) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase.from("fp_empresas").select("id").eq("user_id", user.id).single();
      if (!emp) return;
      setEmpresaId(emp.id);

      const { data: fondo } = await supabase.from("fp_fondo_emergencia").select("*").eq("empresa_id", emp.id).single();
      if (fondo) {
        setFondoId(fondo.id);
        setConfig({ porcentaje_ahorro: fondo.porcentaje_ahorro, meta: fondo.meta });
        setAcumulado(fondo.monto_acumulado);
      }

      const mes = getMesActual();
      const fi = `${mes}-01`, ff = `${mes}-31`;
      const [{ data: ing }, { data: gas }] = await Promise.all([
        supabase.from("fp_ingresos").select("monto").eq("empresa_id", emp.id).gte("fecha", fi).lte("fecha", ff),
        supabase.from("fp_gastos").select("monto").eq("empresa_id", emp.id).gte("fecha", fi).lte("fecha", ff),
      ]);
      setIngresosMes((ing ?? []).reduce((s, r) => s + r.monto, 0));
      setGastosMes((gas ?? []).reduce((s, r) => s + r.monto, 0));
    }
    load();
  }, []);

  async function handleGuardar() {
    if (!empresaId) return;
    const row = { empresa_id: empresaId, porcentaje_ahorro: config.porcentaje_ahorro, meta: config.meta, monto_acumulado: acumulado, updated_at: new Date().toISOString() };
    if (fondoId) {
      await supabase.from("fp_fondo_emergencia").update(row).eq("id", fondoId);
    } else {
      const { data } = await supabase.from("fp_fondo_emergencia").insert(row).select();
      if (data) setFondoId(data[0].id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDepositar() {
    const monto = parseFloat(depositar);
    if (!monto || monto <= 0) return;
    const nuevo = acumulado + monto;
    setAcumulado(nuevo);
    setDepositar("");
    if (empresaId) {
      await supabase.from("fp_fondo_emergencia").upsert({ empresa_id: empresaId, monto_acumulado: nuevo, porcentaje_ahorro: config.porcentaje_ahorro, meta: config.meta, updated_at: new Date().toISOString() }, { onConflict: "empresa_id" });
    }
  }

  const aporteSugerido = calcularAporteFondo(ingresosMes, config.porcentaje_ahorro);
  const runway = calcularRunwayFondo(acumulado, gastosMes);
  const progreso = config.meta > 0 ? Math.min((acumulado / config.meta) * 100, 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <Header title="Fondo de Emergencia" subtitle="Tu red de seguridad financiera empresarial" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "💰 Fondo acumulado", value: formatCLP(acumulado), color: "text-emerald-600" },
            { label: "🎯 Meta del fondo", value: formatCLP(config.meta), color: "text-blue-600" },
            { label: "🛡️ Meses cubiertos", value: `${runway} meses`, color: runway >= 3 ? "text-emerald-600" : "text-red-500" },
            { label: "📆 Aporte sugerido/mes", value: formatCLP(aporteSugerido), color: "text-purple-600" },
          ].map(k => (
            <div key={k.label} className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Barra de progreso */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-5 h-5" /> Progreso hacia la meta</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>{formatCLP(acumulado)}</span>
              <span>Meta: {formatCLP(config.meta)}</span>
            </div>
            <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${progreso}%` }}
              >
                {progreso > 15 && <span className="text-white text-xs font-bold">{formatPorcentaje(progreso, 0)}</span>}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {progreso < 100
                ? `Faltan ${formatCLP(config.meta - acumulado)} para alcanzar la meta (${Math.ceil((config.meta - acumulado) / aporteSugerido)} meses al ritmo actual)`
                : "🎉 ¡Meta alcanzada! Considera aumentar tu meta."
              }
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Configuración */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><PiggyBank className="w-5 h-5" /> Configurar fondo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>% de ingresos a ahorrar mensualmente</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="range" min="1" max="20" step="1" value={config.porcentaje_ahorro} onChange={e => setConfig({...config, porcentaje_ahorro: parseInt(e.target.value)})} className="flex-1" />
                  <span className="text-lg font-bold w-12 text-center text-emerald-600">{config.porcentaje_ahorro}%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Con tus ingresos actuales ({formatCLP(ingresosMes)}/mes) = {formatCLP(aporteSugerido)}/mes</p>
              </div>
              <div>
                <Label>Meta del fondo (CLP)</Label>
                <Input type="number" value={config.meta} onChange={e => setConfig({...config, meta: parseFloat(e.target.value)})} className="mt-1" />
                <p className="text-xs text-slate-500 mt-1">Recomendación: 3-6 meses de gastos operativos ({formatCLP(gastosMes * 3)} – {formatCLP(gastosMes * 6)})</p>
              </div>
              <Button onClick={handleGuardar} className="w-full gap-2">
                <Save className="w-4 h-4" />{saved ? "¡Guardado! ✓" : "Guardar configuración"}
              </Button>
            </CardContent>
          </Card>

          {/* Depositar */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Registrar depósito</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Monto a depositar al fondo (CLP)</Label>
                <Input type="number" value={depositar} onChange={e => setDepositar(e.target.value)} placeholder={String(aporteSugerido)} className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">Sugerido: {formatCLP(aporteSugerido)} ({config.porcentaje_ahorro}% de ingresos del mes)</p>
              </div>
              <Button onClick={handleDepositar} variant="outline" className="w-full gap-2">
                <PiggyBank className="w-4 h-4" /> Agregar al fondo
              </Button>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-1">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>¿Para qué sirve el fondo?</strong>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      <li>Meses sin ventas o clientes lentos</li>
                      <li>Imprevistos: equipo dañado, multas, etc.</li>
                      <li>Cubrir IVA y PPM en meses malos</li>
                      <li>No depender de créditos de consumo</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Análisis de runway:</p>
                <div className={`text-sm font-bold ${runway >= 6 ? "text-emerald-600" : runway >= 3 ? "text-amber-500" : "text-red-500"}`}>
                  {runway >= 6 ? "✅ Excelente" : runway >= 3 ? "⚠️ Aceptable" : "🚨 Crítico"}: {runway} {runway === 1 ? "mes" : "meses"} de operación cubiertos
                </div>
                <p className="text-xs text-slate-400 mt-1">con {formatCLP(gastosMes)}/mes de gastos actuales</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
