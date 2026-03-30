"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCLP, formatFecha, getMesActual } from "@/lib/formatters";
import { TASA_IVA } from "@/lib/calculations";
import { TrendingUp, Plus, Trash2, DollarSign, FileText, Users, Package } from "lucide-react";

const CATEGORIAS: Record<string, { label: string; icon: string; color: string }> = {
  servicios:      { label: "Servicios",       icon: "🛠️", color: "bg-blue-100 text-blue-700" },
  venta_producto: { label: "Venta Producto",  icon: "📦", color: "bg-green-100 text-green-700" },
  honorarios:     { label: "Honorarios",      icon: "📋", color: "bg-purple-100 text-purple-700" },
  arriendo:       { label: "Arriendo",        icon: "🏠", color: "bg-orange-100 text-orange-700" },
  otro:           { label: "Otro",            icon: "💼", color: "bg-slate-100 text-slate-700" },
};

interface Ingreso {
  id: string;
  descripcion: string;
  monto: number;
  monto_iva: number;
  fecha: string;
  categoria: string;
  cliente?: string;
  documento?: string;
  proyecto_id?: string;
}

interface Proyecto { id: string; nombre: string; }

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState(getMesActual());
  const [incluyeIVA, setIncluyeIVA] = useState(false);
  const [form, setForm] = useState({
    descripcion: "", monto: "", con_iva: false,
    fecha: new Date().toISOString().slice(0, 10),
    categoria: "servicios", cliente: "", documento: "", proyecto_id: "",
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
    const [{ data: ing }, { data: proys }] = await Promise.all([
      supabase.from("fp_ingresos").select("*").eq("empresa_id", emp.id)
        .gte("fecha", fi).lte("fecha", ff).order("fecha", { ascending: false }),
      supabase.from("fp_proyectos").select("id, nombre").eq("empresa_id", emp.id).eq("estado", "activo"),
    ]);
    setIngresos(ing ?? []);
    setProyectos(proys ?? []);
  }

  async function handleAgregar() {
    if (!empresaId || !form.monto) return;
    const montoNeto = parseFloat(form.monto);
    const montoIVA = form.con_iva ? montoNeto * TASA_IVA : 0;

    const { data, error } = await supabase.from("fp_ingresos").insert({
      empresa_id: empresaId,
      descripcion: form.descripcion,
      monto: montoNeto,
      monto_iva: montoIVA,
      fecha: form.fecha,
      categoria: form.categoria,
      cliente: form.cliente || null,
      documento: form.documento || null,
      proyecto_id: form.proyecto_id || null,
    }).select();

    if (!error && data) {
      setIngresos(prev => [data[0], ...prev]);
      setOpen(false);
      setForm({ descripcion: "", monto: "", con_iva: false, fecha: new Date().toISOString().slice(0, 10), categoria: "servicios", cliente: "", documento: "", proyecto_id: "" });
    }
  }

  async function handleEliminar(id: string) {
    await supabase.from("fp_ingresos").delete().eq("id", id);
    setIngresos(prev => prev.filter(i => i.id !== id));
  }

  const totalNeto    = ingresos.reduce((s, i) => s + i.monto, 0);
  const totalIVA     = ingresos.reduce((s, i) => s + i.monto_iva, 0);
  const totalBruto   = totalNeto + totalIVA;
  const porCategoria = Object.keys(CATEGORIAS).map(cat => ({
    cat,
    total: ingresos.filter(i => i.categoria === cat).reduce((s, i) => s + i.monto, 0),
  })).filter(c => c.total > 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Ingresos" subtitle="Registro de todos los ingresos de la empresa" />
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "💰 Total neto", value: formatCLP(totalNeto), color: "text-emerald-600" },
            { label: "🧾 IVA débito", value: formatCLP(totalIVA), color: "text-orange-500" },
            { label: "📊 Total bruto", value: formatCLP(totalBruto), color: "text-blue-600" },
            { label: "📄 Transacciones", value: String(ingresos.length), color: "text-slate-700" },
          ].map(k => (
            <div key={k.label} className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Por categoría */}
        {porCategoria.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {porCategoria.map(({ cat, total }) => (
              <div key={cat} className={`px-3 py-1.5 rounded-full text-sm font-medium ${CATEGORIAS[cat]?.color}`}>
                {CATEGORIAS[cat]?.icon} {CATEGORIAS[cat]?.label}: {formatCLP(total)}
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Registro de Ingresos
              </CardTitle>
              <div>
                <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="h-8 text-sm w-36" />
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4" /> Registrar ingreso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nuevo Ingreso</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Categoría</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {Object.entries(CATEGORIAS).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => setForm({...form, categoria: k})}
                          className={`p-2 rounded-lg border text-xs font-medium transition-all ${form.categoria === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-slate-300"}`}
                        >
                          {v.icon} {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Ej: Servicio de diseño web Cliente X" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Monto neto (CLP)</Label>
                      <Input type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="1000000" className="mt-1" />
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="mt-1" />
                    </div>
                  </div>

                  {/* Toggle IVA */}
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <input type="checkbox" id="con_iva" checked={form.con_iva}
                      onChange={e => setForm({...form, con_iva: e.target.checked})}
                      className="w-4 h-4 accent-orange-500" />
                    <div>
                      <label htmlFor="con_iva" className="text-sm font-medium text-orange-800 cursor-pointer">
                        Emitir con IVA (factura)
                      </label>
                      {form.monto && form.con_iva && (
                        <p className="text-xs text-orange-600">IVA: {formatCLP(parseFloat(form.monto) * TASA_IVA)} → Total: {formatCLP(parseFloat(form.monto) * (1 + TASA_IVA))}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cliente (opcional)</Label>
                      <Input value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} placeholder="Nombre del cliente" className="mt-1" />
                    </div>
                    <div>
                      <Label>N° documento</Label>
                      <Input value={form.documento} onChange={e => setForm({...form, documento: e.target.value})} placeholder="Factura / Boleta N°" className="mt-1" />
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

                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAgregar}>
                    Registrar ingreso
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {ingresos.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin ingresos en este período.</p>
                <p className="text-xs mt-1">Registra tu primera venta o servicio.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500 text-xs uppercase">
                      <th className="pb-2 pr-3">Fecha</th>
                      <th className="pb-2 pr-3">Categoría</th>
                      <th className="pb-2 pr-3">Descripción</th>
                      <th className="pb-2 pr-3">Cliente</th>
                      <th className="pb-2 pr-3 text-right">Neto</th>
                      <th className="pb-2 pr-3 text-right">IVA</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {ingresos.map(ing => (
                      <tr key={ing.id} className="border-b hover:bg-slate-50 group">
                        <td className="py-2.5 pr-3 text-slate-500">{formatFecha(ing.fecha)}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIAS[ing.categoria]?.color}`}>
                            {CATEGORIAS[ing.categoria]?.icon} {CATEGORIAS[ing.categoria]?.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-medium max-w-[200px] truncate">{ing.descripcion}</td>
                        <td className="py-2.5 pr-3 text-slate-500 text-xs">{ing.cliente ?? "—"}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-emerald-700">{formatCLP(ing.monto)}</td>
                        <td className="py-2.5 pr-3 text-right text-orange-500 text-xs">{ing.monto_iva > 0 ? formatCLP(ing.monto_iva) : "—"}</td>
                        <td className="py-2.5 text-right font-bold">{formatCLP(ing.monto + ing.monto_iva)}</td>
                        <td className="py-2.5 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEliminar(ing.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t bg-slate-50">
                      <td className="pt-3 pb-1" colSpan={4}>TOTAL {periodo}</td>
                      <td className="pt-3 pb-1 text-right text-emerald-700">{formatCLP(totalNeto)}</td>
                      <td className="pt-3 pb-1 text-right text-orange-500">{formatCLP(totalIVA)}</td>
                      <td className="pt-3 pb-1 text-right text-slate-900">{formatCLP(totalBruto)}</td>
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
