"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCLP, formatFecha, getMesActual } from "@/lib/formatters";
import { detectarGastosHormiga } from "@/lib/calculations";
import { Truck, Plus, Trash2, AlertTriangle } from "lucide-react";

const SUBCATEGORIAS = [
  "Transporte", "Bencina", "Peajes", "Internet", "Telefonía",
  "Insumos de oficina", "Limpieza", "Agua/Luz", "Gasto menor", "Otro",
];

interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  subcategoria: string;
}

export default function OperativoPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState(getMesActual());
  const [form, setForm] = useState({
    descripcion: "", monto: "", fecha: new Date().toISOString().slice(0, 10), subcategoria: "Bencina",
  });
  const supabase = createClient();

  useEffect(() => { loadData(); }, [filtroPeriodo]);

  async function loadData() {
    if (isDemoMode) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: emp } = await supabase.from("fp_empresas").select("id").eq("user_id", user.id).single();
    if (!emp) return;
    setEmpresaId(emp.id);
    const fi = `${filtroPeriodo}-01`;
    const ff = `${filtroPeriodo}-31`;
    const { data } = await supabase.from("fp_gastos")
      .select("*").eq("empresa_id", emp.id).eq("categoria", "operativo")
      .gte("fecha", fi).lte("fecha", ff).order("fecha", { ascending: false });
    setGastos(data ?? []);
  }

  async function handleAgregar() {
    if (!empresaId) return;
    const { data, error } = await supabase.from("fp_gastos").insert({
      empresa_id: empresaId, categoria: "operativo",
      descripcion: form.descripcion, monto: parseFloat(form.monto),
      fecha: form.fecha, subcategoria: form.subcategoria,
    }).select();
    if (!error && data) { setGastos(prev => [data[0], ...prev]); setOpen(false); }
  }

  async function handleEliminar(id: string) {
    await supabase.from("fp_gastos").delete().eq("id", id);
    setGastos(prev => prev.filter(g => g.id !== id));
  }

  const total = gastos.reduce((s, g) => s + g.monto, 0);

  // Agrupar por subcategoría para detectar hormiga
  const porSubcat: Record<string, number> = {};
  gastos.forEach(g => { porSubcat[g.subcategoria ?? "Otro"] = (porSubcat[g.subcategoria ?? "Otro"] ?? 0) + g.monto; });
  const distribucion = Object.entries(porSubcat).map(([categoria, monto]) => ({ categoria, monto }));
  const hormiga = detectarGastosHormiga(distribucion, total, 0.08);

  return (
    <div className="flex flex-col h-full">
      <Header title="Gastos Operativos" subtitle="Transporte, bencina, internet, insumos y gastos menores" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        <div className="flex items-center gap-4">
          <div>
            <Label>Período</Label>
            <Input type="month" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="mt-1 w-44" />
          </div>
          <div className="mt-6 flex gap-4">
            <div className="bg-white border rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Total del período</p>
              <p className="text-xl font-bold text-red-600">{formatCLP(total)}</p>
            </div>
            <div className="bg-white border rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Transacciones</p>
              <p className="text-xl font-bold text-slate-700">{gastos.length}</p>
            </div>
          </div>
        </div>

        {/* Gastos hormiga */}
        {hormiga.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <strong className="text-amber-800">🐜 Gastos Hormiga detectados (supera 8% del total)</strong>
            </div>
            {hormiga.map(h => (
              <p key={h.categoria} className="text-sm text-amber-700 ml-7">
                • {h.categoria}: {formatCLP(h.monto)} ({h.porcentaje.toFixed(1)}% del total)
              </p>
            ))}
          </div>
        )}

        {/* Por subcategoría */}
        {distribucion.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {distribucion.sort((a,b) => b.monto - a.monto).map(d => (
              <div key={d.categoria} className="bg-white border rounded-lg p-3 text-sm">
                <p className="text-slate-500 text-xs">{d.categoria}</p>
                <p className="font-semibold text-slate-800">{formatCLP(d.monto)}</p>
                <p className="text-xs text-slate-400">{total > 0 ? ((d.monto/total)*100).toFixed(1) : 0}%</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-5 h-5" /> Detalle de Gastos
            </CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Agregar gasto</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Gasto Operativo</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Subcategoría</Label>
                    <select value={form.subcategoria} onChange={e => setForm({...form, subcategoria: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {SUBCATEGORIAS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Ej: Bencina Shell Las Condes" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Monto (CLP)</Label>
                      <Input type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="15000" className="mt-1" />
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="mt-1" />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleAgregar}>Guardar gasto</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {gastos.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Sin gastos operativos en este período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs uppercase">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Subcategoría</th>
                    <th className="pb-2">Descripción</th>
                    <th className="pb-2 text-right">Monto</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => (
                    <tr key={g.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 pr-3 text-slate-500">{formatFecha(g.fecha)}</td>
                      <td className="py-2 pr-3"><span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{g.subcategoria}</span></td>
                      <td className="py-2 pr-3">{g.descripcion}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{formatCLP(g.monto)}</td>
                      <td className="py-2"><button onClick={() => handleEliminar(g.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={3} className="pt-3">TOTAL</td>
                    <td className="pt-3 text-right text-red-600">{formatCLP(total)}</td>
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
