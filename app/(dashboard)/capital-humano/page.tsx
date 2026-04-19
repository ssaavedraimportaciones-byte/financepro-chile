"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/formatters";
import { calcularLiquidacion, calcularHonorarios } from "@/lib/calculations";
import { Users, Plus, Calculator } from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  tipo: string;        // 'contrato' | 'honorarios'
  sueldo_bruto: number;
  afp: string;
  salud: string;       // 'fonasa' | 'isapre'
  monto_salud: number;
  activo: boolean;
}

export default function CapitalHumanoPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: "", rut: "", cargo: "", tipo: "contrato",
    sueldo_bruto: "", afp: "Habitat", salud: "fonasa", monto_salud: "",
  });
  // Calculadora honorarios standalone
  const [montoHon, setMontoHon] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (isDemoMode) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase.from("fp_empresas").select("id").eq("user_id", user.id).single();
      if (!emp) return;
      setEmpresaId(emp.id);
      const { data } = await supabase.from("fp_empleados").select("*").eq("empresa_id", emp.id).eq("activo", true);
      setEmpleados(data ?? []);
    }
    load();
  }, []);

  async function handleAgregar() {
    if (!empresaId) return;
    const { data, error } = await supabase.from("fp_empleados").insert({
      empresa_id: empresaId, ...form, sueldo_bruto: parseFloat(form.sueldo_bruto),
      monto_salud: parseFloat(form.monto_salud) || 0,
    }).select();
    if (!error && data) { setEmpleados(prev => [...prev, data[0]]); setOpen(false); }
  }

  const totalCostoEmpresa = empleados.reduce((s, e) => {
    const liq = calcularLiquidacion(e.sueldo_bruto, e.salud as "fonasa"|"isapre", e.monto_salud);
    return s + liq.costo_total_empresa;
  }, 0);

  const honResult = montoHon ? calcularHonorarios(parseFloat(montoHon)) : null;

  return (
    <div className="flex flex-col h-full">
      <Header title="Capital Humano" subtitle="Sueldos, cotizaciones y honorarios" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">👥 Total personas</p>
            <p className="text-xl font-bold text-slate-700">{empleados.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">💰 Costo total empresa/mes</p>
            <p className="text-xl font-bold text-red-600">{formatCLP(totalCostoEmpresa)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500">📊 Promedio bruto</p>
            <p className="text-xl font-bold text-slate-700">{formatCLP(empleados.length > 0 ? empleados.reduce((s,e)=>s+e.sueldo_bruto,0)/empleados.length : 0)}</p>
          </div>
        </div>

        <Tabs defaultValue="empleados">
          <TabsList>
            <TabsTrigger value="empleados">Nómina</TabsTrigger>
            <TabsTrigger value="honorarios">Calculadora Honorarios</TabsTrigger>
            <TabsTrigger value="prevision">Previsión (Previred)</TabsTrigger>
          </TabsList>

          {/* TAB: Nómina */}
          <TabsContent value="empleados">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5" /> Personal</CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Agregar</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nuevo Empleado / Trabajador</DialogTitle></DialogHeader>
                    <div className="space-y-3 mt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Nombre completo</Label><Input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Juan Pérez" className="mt-1"/></div>
                        <div><Label>RUT</Label><Input value={form.rut} onChange={e=>setForm({...form,rut:e.target.value})} placeholder="12.345.678-9" className="mt-1"/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Cargo</Label><Input value={form.cargo} onChange={e=>setForm({...form,cargo:e.target.value})} placeholder="Desarrollador" className="mt-1"/></div>
                        <div>
                          <Label>Tipo</Label>
                          <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="contrato">Contrato</option>
                            <option value="honorarios">Honorarios</option>
                          </select>
                        </div>
                      </div>
                      <div><Label>Sueldo bruto (CLP)</Label><Input type="number" value={form.sueldo_bruto} onChange={e=>setForm({...form,sueldo_bruto:e.target.value})} placeholder="1500000" className="mt-1"/></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>AFP</Label>
                          <select value={form.afp} onChange={e=>setForm({...form,afp:e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            {["Habitat","Capital","Cuprum","Modelo","Planvital","ProVida","Uno"].map(a=><option key={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label>Salud</Label>
                          <select value={form.salud} onChange={e=>setForm({...form,salud:e.target.value})} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="fonasa">Fonasa (7%)</option>
                            <option value="isapre">Isapre</option>
                          </select>
                        </div>
                      </div>
                      {form.salud === "isapre" && (
                        <div><Label>Monto isapre (CLP)</Label><Input type="number" value={form.monto_salud} onChange={e=>setForm({...form,monto_salud:e.target.value})} className="mt-1"/></div>
                      )}
                      <Button className="w-full" onClick={handleAgregar}>Guardar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {empleados.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">Sin personal registrado.</p>
                ) : (
                  <div className="space-y-3">
                    {empleados.map(e => {
                      const liq = calcularLiquidacion(e.sueldo_bruto, e.salud as "fonasa"|"isapre", e.monto_salud);
                      return (
                        <div key={e.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-slate-900">{e.nombre}</p>
                              <p className="text-sm text-slate-500">{e.cargo} · {e.rut}</p>
                            </div>
                            <Badge variant={e.tipo === "contrato" ? "default" : "secondary"}>{e.tipo}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {[
                              { label: "Sueldo Bruto", value: formatCLP(liq.sueldo_bruto), color: "text-slate-700" },
                              { label: "AFP + Salud + Ces.", value: `-${formatCLP(liq.total_descuentos)}`, color: "text-red-500" },
                              { label: "Sueldo Líquido", value: formatCLP(liq.sueldo_liquido), color: "text-green-600 font-bold" },
                              { label: "Costo Total Empresa", value: formatCLP(liq.costo_total_empresa), color: "text-orange-600 font-bold" },
                            ].map(item => (
                              <div key={item.label} className="bg-slate-50 rounded p-2">
                                <p className="text-slate-400">{item.label}</p>
                                <p className={item.color}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Honorarios */}
          <TabsContent value="honorarios">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-5 h-5" /> Calculadora Boleta de Honorarios</CardTitle></CardHeader>
              <CardContent>
                <div className="max-w-md space-y-4">
                  <div>
                    <Label>Monto bruto de la boleta (CLP)</Label>
                    <Input type="number" value={montoHon} onChange={e => setMontoHon(e.target.value)} placeholder="1000000" className="mt-1" />
                  </div>
                  {honResult && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Monto bruto</span>
                        <span className="font-semibold">{formatCLP(honResult.monto_bruto)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Retención (13.75%)</span>
                        <span className="text-red-600 font-semibold">-{formatCLP(honResult.retencion)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="font-bold">Líquido a pagar al trabajador</span>
                        <span className="font-bold text-emerald-700 text-lg">{formatCLP(honResult.monto_liquido)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">* La retención (13.75%) es el PPM que SII descuenta para el impuesto anual del trabajador independiente.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Previsión */}
          <TabsContent value="prevision">
            <Card>
              <CardHeader><CardTitle className="text-base">Resumen Previred</CardTitle></CardHeader>
              <CardContent>
                {empleados.filter(e => e.tipo === "contrato").length === 0 ? (
                  <p className="text-slate-400 text-sm">Sin empleados con contrato registrados.</p>
                ) : (
                  <div>
                    <p className="text-sm text-slate-500 mb-4">Resumen de cotizaciones a pagar vía Previred este mes:</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500 text-xs">
                          <th className="pb-2">Empleado</th>
                          <th className="pb-2 text-right">AFP</th>
                          <th className="pb-2 text-right">Salud</th>
                          <th className="pb-2 text-right">Seg. Cesantía</th>
                          <th className="pb-2 text-right">Mutual+SIS</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empleados.filter(e => e.tipo === "contrato").map(e => {
                          const liq = calcularLiquidacion(e.sueldo_bruto, e.salud as "fonasa"|"isapre", e.monto_salud);
                          return (
                            <tr key={e.id} className="border-b">
                              <td className="py-2">{e.nombre}</td>
                              <td className="py-2 text-right">{formatCLP(liq.afp)}</td>
                              <td className="py-2 text-right">{formatCLP(liq.salud)}</td>
                              <td className="py-2 text-right">{formatCLP(liq.seguro_cesantia)}</td>
                              <td className="py-2 text-right">{formatCLP(liq.mutual + liq.sis)}</td>
                              <td className="py-2 text-right font-bold">{formatCLP(liq.afp + liq.salud + liq.seguro_cesantia + liq.mutual + liq.sis)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold">
                          <td className="pt-3" colSpan={5}>TOTAL A PAGAR VÍA PREVIRED</td>
                          <td className="pt-3 text-right text-red-600">
                            {formatCLP(empleados.filter(e => e.tipo === "contrato").reduce((s, e) => {
                              const liq = calcularLiquidacion(e.sueldo_bruto, e.salud as "fonasa"|"isapre", e.monto_salud);
                              return s + liq.afp + liq.salud + liq.seguro_cesantia + liq.mutual + liq.sis;
                            }, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    <p className="text-xs text-slate-400 mt-3">* Pagar antes del día 13 de cada mes en previred.com</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
