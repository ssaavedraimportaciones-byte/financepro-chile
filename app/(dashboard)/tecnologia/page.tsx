"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCLP, formatFecha } from "@/lib/formatters";
import { Cpu, Plus, Trash2, AlertTriangle } from "lucide-react";

const CATEGORIAS: Record<string, string> = {
  hosting: "🖥️ Hosting",
  dominio: "🌐 Dominio",
  base_datos: "🗄️ Base de datos",
  despliegue: "🚀 Despliegue",
  api_externa: "🔌 API Externa",
  licencia: "📄 Licencia",
  pasarela_pago: "💳 Pasarela Pago",
  otro: "📦 Otro",
};

const MONEDAS: Record<string, number> = { CLP: 1, USD: 950, EUR: 1030 };

interface CostoTec {
  id: string;
  descripcion: string;
  proveedor: string;
  costo: number;
  moneda: string;
  frecuencia: string;
  categoria: string;
  fecha_vencimiento?: string;
}

export default function TecnologiaPage() {
  const [costos, setCostos] = useState<CostoTec[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    descripcion: "", proveedor: "", costo: "", moneda: "USD",
    frecuencia: "mensual", categoria: "hosting", fecha_vencimiento: "",
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
      const { data } = await supabase.from("fp_costos_tecnologicos").select("*").eq("empresa_id", emp.id).order("categoria");
      setCostos(data ?? []);
    }
    load();
  }, []);

  // Convertir a CLP mensual
  function costoMensualCLP(c: CostoTec): number {
    const clp = c.costo * (MONEDAS[c.moneda] ?? 1);
    return c.frecuencia === "anual" ? clp / 12 : c.frecuencia === "unico" ? 0 : clp;
  }

  async function handleAgregar() {
    if (!empresaId) return;
    const { data, error } = await supabase.from("fp_costos_tecnologicos").insert({
      empresa_id: empresaId, ...form, costo: parseFloat(form.costo),
    }).select();
    if (!error && data) { setCostos(prev => [...prev, data[0]]); setOpen(false); }
  }

  async function handleEliminar(id: string) {
    await supabase.from("fp_costos_tecnologicos").delete().eq("id", id);
    setCostos(prev => prev.filter(c => c.id !== id));
  }

  const totalMensualCLP = costos.reduce((s, c) => s + costoMensualCLP(c), 0);
  const totalAnualCLP = totalMensualCLP * 12;

  // Alertas de vencimiento próximo (30 días)
  const hoy = new Date();
  const vencenProximamente = costos.filter(c => {
    if (!c.fecha_vencimiento) return false;
    const diff = (new Date(c.fecha_vencimiento).getTime() - hoy.getTime()) / (1000*60*60*24);
    return diff >= 0 && diff <= 30;
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="Costos Tecnológicos" subtitle="Hosting, APIs, licencias, dominios y herramientas" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">💻 Costo mensual</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatCLP(totalMensualCLP)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">📅 Costo anual</p>
            <p className="text-xl font-bold text-blue-800 mt-1">{formatCLP(totalAnualCLP)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">🔧 Servicios activos</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{costos.length}</p>
          </div>
        </div>

        {/* Alerta vencimientos */}
        {vencenProximamente.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <strong className="text-amber-800">Vencen en los próximos 30 días:</strong>
            </div>
            {vencenProximamente.map(c => (
              <div key={c.id} className="text-sm text-amber-700 ml-7">
                • {c.descripcion} ({c.proveedor}) — vence {formatFecha(c.fecha_vencimiento!)}
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-5 h-5" /> Servicios y Herramientas
            </CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Agregar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Costo Tecnológico</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Descripción</Label>
                      <Input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Ej: Supabase Pro" className="mt-1" />
                    </div>
                    <div>
                      <Label>Proveedor</Label>
                      <Input value={form.proveedor} onChange={e => setForm({...form, proveedor: e.target.value})} placeholder="Ej: Supabase" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Costo</Label>
                      <Input type="number" value={form.costo} onChange={e => setForm({...form, costo: e.target.value})} placeholder="25" className="mt-1" />
                    </div>
                    <div>
                      <Label>Moneda</Label>
                      <select value={form.moneda} onChange={e => setForm({...form, moneda: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="CLP">CLP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div>
                      <Label>Frecuencia</Label>
                      <select value={form.frecuencia} onChange={e => setForm({...form, frecuencia: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="mensual">Mensual</option>
                        <option value="anual">Anual</option>
                        <option value="unico">Único</option>
                      </select>
                    </div>
                  </div>
                  {form.costo && (
                    <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded">
                      ≈ {formatCLP(parseFloat(form.costo) * (MONEDAS[form.moneda] ?? 1) / (form.frecuencia === "anual" ? 12 : 1))} CLP/mes
                    </p>
                  )}
                  <div>
                    <Label>Fecha vencimiento (opcional)</Label>
                    <Input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} className="mt-1" />
                  </div>
                  <Button className="w-full" onClick={handleAgregar}>Guardar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {costos.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Sin costos tecnológicos. Agrega el primero.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs uppercase">
                    <th className="pb-2">Categoría</th>
                    <th className="pb-2">Descripción</th>
                    <th className="pb-2">Proveedor</th>
                    <th className="pb-2 text-right">Costo</th>
                    <th className="pb-2 text-right">Freq.</th>
                    <th className="pb-2 text-right">CLP/mes</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {costos.map(c => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 pr-2">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{CATEGORIAS[c.categoria] ?? c.categoria}</span>
                      </td>
                      <td className="py-2 pr-2 font-medium">{c.descripcion}</td>
                      <td className="py-2 pr-2 text-slate-500">{c.proveedor}</td>
                      <td className="py-2 pr-2 text-right">{c.costo} {c.moneda}</td>
                      <td className="py-2 pr-2 text-right">
                        <Badge variant="outline">{c.frecuencia}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold text-blue-600">{formatCLP(costoMensualCLP(c))}</td>
                      <td className="py-2">
                        <button onClick={() => handleEliminar(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t">
                    <td className="pt-3" colSpan={5}>TOTAL MENSUAL</td>
                    <td className="pt-3 text-right text-blue-700 text-base">{formatCLP(totalMensualCLP)}</td>
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
