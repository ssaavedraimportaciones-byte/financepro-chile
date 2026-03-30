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
import { formatCLP, formatFecha, formatPorcentaje } from "@/lib/formatters";
import { FolderKanban, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Proyecto {
  id: string;
  nombre: string;
  cliente?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: string;
  presupuesto?: number;
  ingresos?: number;
  costos?: number;
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", cliente: "", fecha_inicio: new Date().toISOString().slice(0,10), fecha_fin: "", estado: "activo", presupuesto: "" });
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (isDemoMode) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase.from("fp_empresas").select("id").eq("user_id", user.id).single();
      if (!emp) return;
      setEmpresaId(emp.id);
      const { data: proys } = await supabase.from("fp_proyectos").select("*").eq("empresa_id", emp.id).order("fecha_inicio", { ascending: false });
      if (!proys) return;

      // Para cada proyecto, obtener ingresos y costos asociados
      const proyConRentabilidad = await Promise.all(proys.map(async p => {
        const [{ data: ing }, { data: gas }] = await Promise.all([
          supabase.from("fp_ingresos").select("monto").eq("proyecto_id", p.id),
          supabase.from("fp_gastos").select("monto").eq("proyecto_id", p.id),
        ]);
        const ingresos = (ing ?? []).reduce((s, r) => s + r.monto, 0);
        const costos = (gas ?? []).reduce((s, r) => s + r.monto, 0);
        return { ...p, ingresos, costos };
      }));

      setProyectos(proyConRentabilidad);
    }
    load();
  }, []);

  async function handleAgregar() {
    if (!empresaId) return;
    const { data, error } = await supabase.from("fp_proyectos").insert({
      empresa_id: empresaId, ...form, presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null,
    }).select();
    if (!error && data) { setProyectos(prev => [{ ...data[0], ingresos: 0, costos: 0 }, ...prev]); setOpen(false); }
  }

  const totalIngresos = proyectos.reduce((s, p) => s + (p.ingresos ?? 0), 0);
  const totalCostos = proyectos.reduce((s, p) => s + (p.costos ?? 0), 0);
  const totalUtilidad = totalIngresos - totalCostos;

  return (
    <div className="flex flex-col h-full">
      <Header title="Centro de Costos por Proyecto" subtitle="Rentabilidad real por proyecto, cliente y producto" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Resumen total */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">📁 Proyectos activos</p>
            <p className="text-xl font-bold">{proyectos.filter(p => p.estado === "activo").length}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">💰 Ingresos totales</p>
            <p className="text-xl font-bold text-green-600">{formatCLP(totalIngresos)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">📊 Utilidad total</p>
            <p className={`text-xl font-bold ${totalUtilidad >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCLP(totalUtilidad)}</p>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Proyectos</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nuevo proyecto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo Proyecto</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Nombre del proyecto</Label>
                  <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: App móvil para cliente X" className="mt-1" />
                </div>
                <div>
                  <Label>Cliente (opcional)</Label>
                  <Input value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} placeholder="Nombre del cliente" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fecha inicio</Label>
                    <Input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className="mt-1" />
                  </div>
                  <div>
                    <Label>Fecha fin (opcional)</Label>
                    <Input type="date" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Estado</Label>
                    <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="activo">Activo</option>
                      <option value="pausado">Pausado</option>
                      <option value="terminado">Terminado</option>
                    </select>
                  </div>
                  <div>
                    <Label>Presupuesto (CLP)</Label>
                    <Input type="number" value={form.presupuesto} onChange={e => setForm({...form, presupuesto: e.target.value})} placeholder="5000000" className="mt-1" />
                  </div>
                </div>
                <Button className="w-full" onClick={handleAgregar}>Crear proyecto</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {proyectos.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Sin proyectos creados. Crea el primero para trackear rentabilidad.</p>
            </div>
          ) : (
            proyectos.map(p => {
              const ingresos = p.ingresos ?? 0;
              const costos = p.costos ?? 0;
              const utilidad = ingresos - costos;
              const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;
              const presupuestoUsado = p.presupuesto && p.presupuesto > 0 ? (costos / p.presupuesto) * 100 : null;

              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{p.nombre}</h3>
                        {p.cliente && <p className="text-sm text-slate-500">Cliente: {p.cliente}</p>}
                        <p className="text-xs text-slate-400">{formatFecha(p.fecha_inicio)}{p.fecha_fin && ` → ${formatFecha(p.fecha_fin)}`}</p>
                      </div>
                      <Badge variant={p.estado === "activo" ? "success" : p.estado === "pausado" ? "warning" : "secondary"}>
                        {p.estado}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Ingresos</p>
                        <p className="font-bold text-green-700">{formatCLP(ingresos)}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Costos</p>
                        <p className="font-bold text-red-600">{formatCLP(costos)}</p>
                      </div>
                      <div className={`rounded-lg p-3 ${utilidad >= 0 ? "bg-emerald-50" : "bg-red-100"}`}>
                        <p className="text-xs text-slate-500">Utilidad</p>
                        <div className="flex items-center gap-1">
                          {utilidad > 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : utilidad < 0 ? <TrendingDown className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3 text-slate-400" />}
                          <p className={`font-bold ${utilidad >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCLP(utilidad)}</p>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Margen</p>
                        <p className={`font-bold ${margen >= 30 ? "text-blue-700" : margen >= 10 ? "text-amber-600" : "text-red-600"}`}>
                          {formatPorcentaje(margen)}
                        </p>
                      </div>
                    </div>

                    {presupuestoUsado !== null && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Presupuesto usado</span>
                          <span>{formatPorcentaje(presupuestoUsado)} de {formatCLP(p.presupuesto!)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${presupuestoUsado > 90 ? "bg-red-500" : presupuestoUsado > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(presupuestoUsado, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
