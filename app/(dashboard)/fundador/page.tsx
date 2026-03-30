"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCLP } from "@/lib/formatters";
import { calcularValorHora } from "@/lib/calculations";
import { UserCircle, Clock, Save, Info } from "lucide-react";

export default function FundadorPage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    nombre: "Fundador",
    sueldo_reemplazo: 3000000,
    horas_mensuales: 160,
    multiplicador_riesgo: 1.4,
  });
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (isDemoMode) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase.from("fp_empresas").select("id, nombre").eq("user_id", user.id).single();
      if (!emp) return;
      setEmpresaId(emp.id);
      const { data: cf } = await supabase.from("fp_config_fundador").select("*").eq("empresa_id", emp.id).single();
      if (cf) setConfig({ nombre: cf.nombre, sueldo_reemplazo: cf.sueldo_reemplazo, horas_mensuales: cf.horas_mensuales, multiplicador_riesgo: cf.multiplicador_riesgo });
    }
    load();
  }, []);

  async function handleGuardar() {
    if (!empresaId) return;
    await supabase.from("fp_config_fundador").upsert({ empresa_id: empresaId, ...config, updated_at: new Date().toISOString() }, { onConflict: "empresa_id" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const { valor_hora, costo_mensual } = calcularValorHora(
    config.sueldo_reemplazo, config.horas_mensuales, config.multiplicador_riesgo
  );

  const horasDia = (config.horas_mensuales / 22).toFixed(1);

  return (
    <div className="flex flex-col h-full">
      <Header title="Valor Hora del Fundador" subtitle="¿Cuánto cuesta realmente tu tiempo?" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Info educativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>¿Por qué calcular el valor hora del fundador?</strong>
              <p className="mt-1">Como fundador, tu tiempo tiene un costo real que muchos no contabilizan. Si tuvieras que contratar a alguien con tus habilidades, ¿cuánto costaría? Ese es el costo que debes incluir en tu rentabilidad real.
              Además, se aplica un multiplicador de riesgo porque emprender implica incertidumbre, estrés y sacrificio de beneficios laborales.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCircle className="w-5 h-5" /> Configuración</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nombre del fundador</Label>
                <Input value={config.nombre} onChange={e => setConfig({...config, nombre: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label>Sueldo de reemplazo (CLP/mes)</Label>
                <p className="text-xs text-slate-500 mb-1">¿Cuánto le pagarías a alguien con tus skills para hacer tu trabajo?</p>
                <Input type="number" value={config.sueldo_reemplazo} onChange={e => setConfig({...config, sueldo_reemplazo: parseFloat(e.target.value)})} className="mt-1" />
              </div>
              <div>
                <Label>Horas trabajadas al mes</Label>
                <Input type="number" value={config.horas_mensuales} onChange={e => setConfig({...config, horas_mensuales: parseFloat(e.target.value)})} className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">≈ {horasDia} horas/día (22 días hábiles)</p>
              </div>
              <div>
                <Label>Multiplicador de riesgo emprendedor</Label>
                <p className="text-xs text-slate-500 mb-1">Rango recomendado: 1.3 (bajo) – 1.5 (alto). Refleja la prima por incertidumbre.</p>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range" min="1.0" max="2.0" step="0.05"
                    value={config.multiplicador_riesgo}
                    onChange={e => setConfig({...config, multiplicador_riesgo: parseFloat(e.target.value)})}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold w-12 text-center text-emerald-600">{config.multiplicador_riesgo.toFixed(2)}x</span>
                </div>
              </div>
              <Button onClick={handleGuardar} className="w-full gap-2">
                <Save className="w-4 h-4" />{saved ? "¡Guardado! ✓" : "Guardar configuración"}
              </Button>
            </CardContent>
          </Card>

          {/* Resultado */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-6 text-white">
              <p className="text-emerald-100 text-sm">Tu valor hora real</p>
              <p className="text-5xl font-bold mt-1">{formatCLP(valor_hora)}</p>
              <p className="text-emerald-200 text-sm mt-1">por hora trabajada</p>
            </div>

            <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl p-6 text-white">
              <p className="text-slate-300 text-sm">Costo mensual equivalente</p>
              <p className="text-4xl font-bold mt-1">{formatCLP(costo_mensual)}</p>
              <p className="text-slate-400 text-sm mt-1">si pagaras tu propio sueldo</p>
            </div>

            {/* Desglose */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm">Desglose del cálculo:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sueldo de reemplazo</span>
                    <span>{formatCLP(config.sueldo_reemplazo)}/mes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">÷ Horas mensuales</span>
                    <span>{config.horas_mensuales} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">= Valor hora base</span>
                    <span>{formatCLP(Math.round(config.sueldo_reemplazo / config.horas_mensuales))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">× Multiplicador riesgo</span>
                    <span className="text-emerald-600 font-semibold">{config.multiplicador_riesgo}x</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>= Valor hora real</span>
                    <span className="text-emerald-600">{formatCLP(valor_hora)}/hr</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advertencias */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>💡 Úsalo así:</strong>
              <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                <li>Si usas 10 hrs en un proyecto, el costo fundador es {formatCLP(valor_hora * 10)}</li>
                <li>No cobres proyectos sin incluir este costo</li>
                <li>Si el precio de mercado no cubre esto → analiza la rentabilidad</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
