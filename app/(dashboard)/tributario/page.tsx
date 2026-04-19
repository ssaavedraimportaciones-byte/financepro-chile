"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCLP, formatFecha, getMesActual } from "@/lib/formatters";
import { calcularIVA, calcularPPM, estimarImpuestoRenta } from "@/lib/calculations";
import { Receipt, Calculator, CheckCircle, AlertCircle, Plus } from "lucide-react";

interface RegistroTrib {
  id: string;
  periodo: string;
  iva_debito: number;
  iva_credito: number;
  iva_pagar: number;
  ppm: number;
  pagado: boolean;
  fecha_pago?: string;
}

export default function TributarioPage() {
  const [registros, setRegistros] = useState<RegistroTrib[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [regimen, setRegimen] = useState<"pro_pyme_general"|"pro_pyme_transparente"|"general">("pro_pyme_general");
  const [form, setForm] = useState({ periodo: getMesActual(), iva_debito: "", iva_credito: "", pagado: false });
  const [loading, setLoading] = useState(!isDemoMode);
  const supabase = createClient();

  // Calculadora en tiempo real
  const ivaDebito = parseFloat(form.iva_debito) || 0;
  const ivaCredito = parseFloat(form.iva_credito) || 0;
  const calIVA = calcularIVA(ivaDebito, ivaCredito);
  const calPPM = calcularPPM(ivaDebito / 0.19, regimen); // venta neta

  useEffect(() => {
    async function load() {
      if (isDemoMode) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase.from("fp_empresas").select("id, regimen_tributario").eq("user_id", user.id).single();
      if (!emp) { setLoading(false); return; }
      setEmpresaId(emp.id);
      setRegimen(emp.regimen_tributario as typeof regimen);
      const { data } = await supabase.from("fp_registros_tributarios").select("*").eq("empresa_id", emp.id).order("periodo", { ascending: false });
      setRegistros(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleGuardar() {
    if (!empresaId) return;
    const row = {
      empresa_id: empresaId,
      periodo: form.periodo,
      iva_debito: calIVA.iva_debito,
      iva_credito: calIVA.iva_credito,
      iva_pagar: calIVA.iva_neto,
      ppm: calPPM.ppm_calculado,
      pagado: form.pagado,
    };
    const { data, error } = await supabase.from("fp_registros_tributarios").upsert(row, { onConflict: "empresa_id,periodo" }).select();
    if (!error && data) {
      setRegistros(prev => {
        const idx = prev.findIndex(r => r.periodo === form.periodo);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = data[0]; return copy; }
        return [data[0], ...prev];
      });
    }
  }

  async function marcarPagado(id: string) {
    await supabase.from("fp_registros_tributarios").update({ pagado: true, fecha_pago: new Date().toISOString().slice(0,10) }).eq("id", id);
    setRegistros(prev => prev.map(r => r.id === id ? {...r, pagado: true} : r));
  }

  const totalAnual = registros.reduce((s, r) => s + r.iva_pagar + r.ppm, 0);
  const utilidadEstimada = registros.reduce((s, r) => s + (r.iva_debito / 0.19 - r.iva_credito / 0.19) * 0.5, 0);
  const renta = estimarImpuestoRenta(utilidadEstimada, regimen);

  return (
    <div className="flex flex-col h-full">
      <Header title="Obligaciones Tributarias (SII)" subtitle="IVA, PPM e Impuesto a la Renta" />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Calculadora interactiva */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Calculadora del Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div>
                  <Label>Período</Label>
                  <Input type="month" value={form.periodo} onChange={e => setForm({...form, periodo: e.target.value})} className="mt-1" />
                </div>
                <div>
                  <Label>Ventas con Factura (IVA débito base)</Label>
                  <Input type="number" value={form.iva_debito} onChange={e => setForm({...form, iva_debito: e.target.value})} placeholder="Ej: 5000000" className="mt-1" />
                  <p className="text-xs text-slate-500 mt-1">Monto neto de las facturas emitidas</p>
                </div>
                <div>
                  <Label>Compras con Factura (IVA crédito base)</Label>
                  <Input type="number" value={form.iva_credito} onChange={e => setForm({...form, iva_credito: e.target.value})} placeholder="Ej: 2000000" className="mt-1" />
                  <p className="text-xs text-slate-500 mt-1">Monto neto de las facturas recibidas</p>
                </div>
              </div>

              {/* Resultado calculado */}
              <div className="md:col-span-2 bg-slate-50 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-700">Resultado Calculado</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "IVA Débito (19%)", value: formatCLP(calIVA.iva_debito), color: "text-red-600" },
                    { label: "IVA Crédito (19%)", value: formatCLP(calIVA.iva_credito), color: "text-green-600" },
                    { label: "🏦 IVA A PAGAR", value: formatCLP(calIVA.iva_neto), color: "text-orange-600 font-bold text-lg" },
                    { label: "PPM (1% ventas)", value: formatCLP(calPPM.ppm_calculado), color: "text-purple-600" },
                  ].map(item => (
                    <div key={item.label} className="bg-white rounded-lg p-3 border">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className={`text-base font-semibold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total obligaciones del período:</p>
                    <p className="text-xl font-bold text-slate-900">{formatCLP(calIVA.iva_neto + calPPM.ppm_calculado)}</p>
                  </div>
                  <Button onClick={handleGuardar} className="gap-2">
                    <Plus className="w-4 h-4" /> Guardar período
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estimación renta anual */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base text-purple-800">Estimación Impuesto a la Renta Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Régimen</p>
                <p className="font-semibold">{regimen === "pro_pyme_general" ? "Pro Pyme General (25%)" : regimen === "pro_pyme_transparente" ? "Pro Pyme Transparente" : "General (27%)"}</p>
              </div>
              <div>
                <p className="text-slate-500">Utilidad estimada</p>
                <p className="font-semibold">{formatCLP(utilidadEstimada)}</p>
              </div>
              <div>
                <p className="text-slate-500">Impuesto a la Renta estimado</p>
                <p className="font-bold text-purple-700 text-lg">{formatCLP(renta)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5" /> Historial de Períodos Tributarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-500 text-sm">Cargando...</p>
            ) : registros.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No hay períodos registrados aún. Usa la calculadora para agregar el primer período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 pr-4">Período</th>
                      <th className="pb-2 pr-4">IVA Débito</th>
                      <th className="pb-2 pr-4">IVA Crédito</th>
                      <th className="pb-2 pr-4">IVA a Pagar</th>
                      <th className="pb-2 pr-4">PPM</th>
                      <th className="pb-2 pr-4">Total</th>
                      <th className="pb-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map(r => (
                      <tr key={r.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium">{r.periodo}</td>
                        <td className="py-2 pr-4">{formatCLP(r.iva_debito)}</td>
                        <td className="py-2 pr-4 text-green-600">{formatCLP(r.iva_credito)}</td>
                        <td className="py-2 pr-4 font-semibold text-orange-600">{formatCLP(r.iva_pagar)}</td>
                        <td className="py-2 pr-4 text-purple-600">{formatCLP(r.ppm)}</td>
                        <td className="py-2 pr-4 font-bold">{formatCLP(r.iva_pagar + r.ppm)}</td>
                        <td className="py-2">
                          {r.pagado ? (
                            <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Pagado</Badge>
                          ) : (
                            <button onClick={() => marcarPagado(r.id)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800">
                              <AlertCircle className="w-3 h-3" />Pendiente
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-slate-900">
                      <td className="pt-3" colSpan={5}>Total acumulado</td>
                      <td className="pt-3 text-red-600">{formatCLP(totalAnual)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
