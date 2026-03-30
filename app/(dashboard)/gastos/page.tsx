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
import { TrendingDown, Plus, Trash2, AlertTriangle, Filter } from "lucide-react";

const CATEGORIAS: Record<string, { label: string; icon: string; color: string }> = {
  formalizacion:  { label: "Formalización",  icon: "⚖️", color: "bg-blue-100 text-blue-700" },
  tecnologia:     { label: "Tecnología",     icon: "💻", color: "bg-cyan-100 text-cyan-700" },
  operativo:      { label: "Operativo",      icon: "🚛", color: "bg-orange-100 text-orange-700" },
  capital_humano: { label: "Capital Humano", icon: "👥", color: "bg-purple-100 text-purple-700" },
  tributario:     { label: "Tributario",     icon: "🏛️", color: "bg-red-100 text-red-700" },
  marketing:      { label: "Marketing",      icon: "📣", color: "bg-pink-100 text-pink-700" },
  arriendo:       { label: "Arriendo",       icon: "🏠", color: "bg-yellow-100 text-yellow-700" },
  otro:           { label: "Otro",           icon: "📦", color: "bg-slate-100 text-slate-700" },
};

interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  monto_iva: number;
  fecha: string;
  categoria: string;
  subcategoria?: string;
  proveedor?: string;
}

interface Proyecto { id: string; nombre: string; }

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState(getMesActual());
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [form, setForm] = useState({
    descripcion: "", monto: "", con_iva: false,
    fecha: new Date().toISOString().slice(0, 10),
    categoria: "operativo", subcategoria: "", proveedor: "", proyecto_id: "",
  });
  const supabase = createClient();

  useEffect(() => { loadData(); }, [periodo]);

  async function loadData() {
    if (isDemoMode) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: emp } = await supabase.from("fp_empresas").select("id").eq("user_id", user.id).single();
    if (!emp) return;
    setEmpresaId(emp.id);

    const fi = `${periodo}-01`, ff = `${periodo}-31`;
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from("fp_gastos").select("*").eq("empresa_id", emp.id)
        .gte("fecha", fi).lte("fecha", ff).order("fecha", { ascending: false }),
      supabase.from("fp_proyectos").select("id, nombre").eq("empresa_id", emp.id),
    ]);
    setGastos(g ?? []);
    setProyectos(p ?? []);
  }

  async function handleAgregar() {
    if (!empresaId || !form.monto) return;
    const monto = parseFloat(form.monto);
    const monto_iva = form.con_iva ? monto * 0.19 : 0;

    const { data, error } = await supabase.from("fp_gastos").insert({
      empresa_id: empresaId, descripcion: form.descripcion, monto, monto_iva,
      fecha: form.fecha, categoria: form.categoria,
      subcategoria: form.subcategoria || null,
      proveedor: form.proveedor || null,
      proyecto_id: form.proyecto_id || null,
    }).select();

    if (!error && data) {
      setGastos(prev => [data[0], ...prev]);
      setOpen(false);
      setForm({ descripcion: "", monto: "", con_iva: false, fecha: new Date().toISOString().slice(0, 10), categoria: "operativo", subcategoria: "", proveedor: "", proyecto_id: "" });
    }
  }

  async function handleEliminar(id: string) {
    await supabase.from("fp_gastos").delete().eq("id", id);
    setGastos(prev => prev.filter(g => g.id !== id));
  }

  const gastosFiltrados = filtroCategoria === "todas" ? gastos : gastos.filter(g => g.categoria === filtroCategoria);
  const total = gastos.reduce((s, g) => s + g.monto, 0);
  const totalIVACredito = gastos.reduce((s, g) => s + g.monto_iva, 0);

  // Distribución para gastos hormiga
  const distribucion = Object.keys(CATEGORIAS).map(cat => ({
    categoria: cat,
    monto: gastos.filter(g => g.categoria === cat).reduce((s, g) => s + g.monto, 0),
  })).filter(d => d.monto > 0);
  const hormiga = detectarGastosHormiga(distribucion, total);

  return (
    <div className="flex flex-col h-full">
      <Header title="Gastos Generales" subtitle="Todos los egresos clasificados por categoría" />
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">💸 Total gastos neto</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCLP(total)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">🧾 IVA crédito fiscal</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCLP(totalIVACredito)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">📊 Transacciones</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{gastos.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">📆 Promedio diario</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{formatCLP(total / 30)}</p>
          </div>
        </div>

        {/* Alerta hormiga */}
        {hormiga.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">🐜 Gastos Hormiga detectados</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {hormiga.map(h => (
                  <span key={h.categoria} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    {CATEGORIAS[h.categoria]?.icon} {CATEGORIAS[h.categoria]?.label}: {formatCLP(h.monto)} ({h.porcentaje.toFixed(1)}%)
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Barras por categoría */}
        {distribucion.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold text-slate-600 mb-3">Distribución por categoría</p>
              <div className="space-y-2">
                {distribucion.sort((a,b)=>b.monto-a.monto).map(d => (
                  <div key={d.categoria}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600">{CATEGORIAS[d.categoria]?.icon} {CATEGORIAS[d.categoria]?.label}</span>
                      <span className="font-semibold">{formatCLP(d.monto)} <span className="text-slate-400 font-normal">({total > 0 ? ((d.monto/total)*100).toFixed(1) : 0}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{ width: `${total > 0 ? (d.monto/total)*100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-4 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" /> Detalle
              </CardTitle>
              <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="h-8 text-sm w-36" />
              <div className="flex items-center gap-1 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                {["todas", ...Object.keys(CATEGORIAS)].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFiltroCategoria(cat)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${filtroCategoria === cat ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {cat === "todas" ? "Todas" : CATEGORIAS[cat]?.icon}
                  </button>
                ))}
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4" /> Registrar gasto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nuevo Gasto</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Categoría</Label>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {Object.entries(CATEGORIAS).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => setForm({...form, categoria: k})}
                          className={`p-2 rounded-lg border text-xs font-medium transition-all ${form.categoria === k ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 hover:border-slate-300"}`}
                        >
                          {v.icon} {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Ej: Hosting mensual AWS" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Monto neto (CLP)</Label>
                      <Input type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="50000" className="mt-1" />
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <input type="checkbox" id="con_iva_g" checked={form.con_iva}
                      onChange={e => setForm({...form, con_iva: e.target.checked})}
                      className="w-4 h-4 accent-green-600" />
                    <label htmlFor="con_iva_g" className="text-sm font-medium text-green-800 cursor-pointer">
                      Tiene factura con IVA (crédito fiscal 19%)
                      {form.monto && form.con_iva && <span className="block text-xs font-normal text-green-600">IVA crédito: {formatCLP(parseFloat(form.monto) * 0.19)}</span>}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Proveedor</Label>
                      <Input value={form.proveedor} onChange={e => setForm({...form, proveedor: e.target.value})} placeholder="Nombre proveedor" className="mt-1" />
                    </div>
                    <div>
                      <Label>Subcategoría</Label>
                      <Input value={form.subcategoria} onChange={e => setForm({...form, subcategoria: e.target.value})} placeholder="Ej: Bencina, SaaS..." className="mt-1" />
                    </div>
                  </div>
                  {proyectos.length > 0 && (
                    <div>
                      <Label>Proyecto (opcional)</Label>
                      <select value={form.proyecto_id} onChange={e => setForm({...form, proyecto_id: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Sin proyecto</option>
                        {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleAgregar}>Registrar gasto</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {gastosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin gastos{filtroCategoria !== "todas" ? ` en categoría "${CATEGORIAS[filtroCategoria]?.label}"` : ""} en este período.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500 text-xs uppercase">
                      <th className="pb-2 pr-3">Fecha</th>
                      <th className="pb-2 pr-3">Categoría</th>
                      <th className="pb-2 pr-3">Descripción</th>
                      <th className="pb-2 pr-3">Proveedor</th>
                      <th className="pb-2 pr-3 text-right">Neto</th>
                      <th className="pb-2 text-right">IVA CF</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {gastosFiltrados.map(g => (
                      <tr key={g.id} className="border-b hover:bg-slate-50 group">
                        <td className="py-2.5 pr-3 text-slate-500">{formatFecha(g.fecha)}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIAS[g.categoria]?.color}`}>
                            {CATEGORIAS[g.categoria]?.icon} {CATEGORIAS[g.categoria]?.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-medium max-w-[200px] truncate">{g.descripcion}</td>
                        <td className="py-2.5 pr-3 text-slate-400 text-xs">{g.proveedor ?? "—"}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-red-600">{formatCLP(g.monto)}</td>
                        <td className="py-2.5 text-right text-green-600 text-xs">{g.monto_iva > 0 ? formatCLP(g.monto_iva) : "—"}</td>
                        <td className="py-2.5 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEliminar(g.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t bg-slate-50">
                      <td className="pt-3 pb-1" colSpan={4}>TOTAL</td>
                      <td className="pt-3 pb-1 text-right text-red-600">{formatCLP(gastosFiltrados.reduce((s,g)=>s+g.monto,0))}</td>
                      <td className="pt-3 pb-1 text-right text-green-600">{formatCLP(gastosFiltrados.reduce((s,g)=>s+g.monto_iva,0))}</td>
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
