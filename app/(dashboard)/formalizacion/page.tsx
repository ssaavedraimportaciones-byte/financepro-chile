"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCLP, formatFecha } from "@/lib/formatters";
import { Scale, Plus, Trash2, TrendingDown } from "lucide-react";

const TIPOS: Record<string, string> = {
  constitucion: "Constitución de empresa",
  fea: "Firma Electrónica Avanzada",
  notaria: "Notaría",
  marca_inapi: "Marca INAPI",
  patente_municipal: "Patente Municipal",
  otro: "Otro",
};

interface Costo {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  tipo: string;
  amortizacion_meses: number;
  costo_mensual_amortizado: number;
}

export default function FormalizacionPage() {
  const [costos, setCostos] = useState<Costo[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    descripcion: "", monto: "", fecha: new Date().toISOString().slice(0, 10),
    tipo: "constitucion", amortizacion_meses: "12",
  });
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (isDemoMode) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase.from("fp_empresas").select("id").eq("user_id", user.id).single();
      if (!emp) return;
      setEmpresaId(emp.id);
      const { data } = await supabase.from("fp_costos_formalizacion").select("*").eq("empresa_id", emp.id).order("fecha", { ascending: false });
      setCostos(data ?? []);
    }
    load();
  }, []);

  async function handleAgregar() {
    if (!empresaId) return;
    const { data, error } = await supabase.from("fp_costos_formalizacion").insert({
      empresa_id: empresaId,
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      tipo: form.tipo,
      amortizacion_meses: parseInt(form.amortizacion_meses),
    }).select();
    if (!error && data) {
      setCostos(prev => [data[0], ...prev]);
      setOpen(false);
      setForm({ descripcion: "", monto: "", fecha: new Date().toISOString().slice(0, 10), tipo: "constitucion", amortizacion_meses: "12" });
    }
  }

  async function handleEliminar(id: string) {
    await supabase.from("fp_costos_formalizacion").delete().eq("id", id);
    setCostos(prev => prev.filter(c => c.id !== id));
  }

  const totalGastado = costos.reduce((s, c) => s + c.monto, 0);
  const costoMensualTotal = costos.reduce((s, c) => s + c.costo_mensual_amortizado, 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Costos de Formalización" subtitle="Constitución, registros, patentes y costos legales" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total invertido", value: formatCLP(totalGastado), color: "text-red-600", icon: "💸" },
            { label: "Costo mensual amortizado", value: formatCLP(costoMensualTotal), color: "text-orange-600", icon: "📆" },
            { label: "Total conceptos", value: String(costos.length), color: "text-slate-700", icon: "📋" },
          ].map(item => (
            <div key={item.label} className="bg-white border rounded-xl p-4">
              <p className="text-sm text-slate-500">{item.icon} {item.label}</p>
              <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Info educativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>💡 ¿Qué es amortización?</strong> Los costos de formalización son inversiones únicas que se &quot;diluyen&quot; en el tiempo.
          Divídelos entre los meses de uso para saber su costo mensual real. Ejemplo: $200.000 de constitución ÷ 60 meses = $3.333/mes.
        </div>

        {/* Tabla + botón agregar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-5 h-5" /> Registro de Costos
            </CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Agregar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Costo de Formalización</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Tipo</Label>
                    <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Ej: Constitución SpA en Notaría X" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Monto (CLP)</Label>
                      <Input type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="200000" className="mt-1" />
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Amortizar en (meses)</Label>
                    <Input type="number" value={form.amortizacion_meses} onChange={e => setForm({...form, amortizacion_meses: e.target.value})} placeholder="12" className="mt-1" />
                    {form.monto && form.amortizacion_meses && (
                      <p className="text-xs text-emerald-600 mt-1">
                        = {formatCLP(parseFloat(form.monto) / parseInt(form.amortizacion_meses))} / mes
                      </p>
                    )}
                  </div>
                  <Button className="w-full" onClick={handleAgregar}>Guardar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {costos.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Sin costos de formalización. Agrega el primero con el botón &quot;+&quot;.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs uppercase">
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Descripción</th>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2 text-right">Monto</th>
                    <th className="pb-2 text-right">Meses</th>
                    <th className="pb-2 text-right">$/Mes</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {costos.map(c => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 pr-3">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{TIPOS[c.tipo] ?? c.tipo}</span>
                      </td>
                      <td className="py-2 pr-3">{c.descripcion}</td>
                      <td className="py-2 pr-3 text-slate-500">{formatFecha(c.fecha)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{formatCLP(c.monto)}</td>
                      <td className="py-2 pr-3 text-right text-slate-500">{c.amortizacion_meses}</td>
                      <td className="py-2 pr-3 text-right text-emerald-600 font-medium">{formatCLP(c.costo_mensual_amortizado)}</td>
                      <td className="py-2">
                        <button onClick={() => handleEliminar(c.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="pt-3" colSpan={3}>TOTAL</td>
                    <td className="pt-3 text-right text-red-600">{formatCLP(totalGastado)}</td>
                    <td />
                    <td className="pt-3 text-right text-emerald-700">{formatCLP(costoMensualTotal)}<span className="font-normal text-xs text-slate-500">/mes</span></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
