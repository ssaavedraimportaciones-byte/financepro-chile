"use client";
import { useState, useEffect } from "react";
import { createClient, isDemoMode } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, CheckCircle2, Building2, Shield, Database } from "lucide-react";

interface Empresa {
  id: string;
  nombre: string;
  rut: string;
  giro: string;
  regimen_tributario: string;
}

export default function ConfiguracionPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [form, setForm] = useState({ nombre: "", rut: "", giro: "", regimen_tributario: "pro_pyme_general" });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(!isDemoMode);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (isDemoMode) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: emp } = await supabase.from("fp_empresas").select("*").eq("user_id", user.id).single();
      if (emp) {
        setEmpresa(emp);
        setForm({ nombre: emp.nombre, rut: emp.rut, giro: emp.giro ?? "", regimen_tributario: emp.regimen_tributario });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleGuardar() {
    if (!empresa) return;
    const { error } = await supabase.from("fp_empresas").update({
      nombre: form.nombre, rut: form.rut, giro: form.giro, regimen_tributario: form.regimen_tributario,
    }).eq("id", empresa.id);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }


  return (
    <div className="flex flex-col h-full">
      <Header title="Configuración" subtitle="Datos de tu empresa y ajustes del sistema" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-3xl">

        {/* Datos empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" /> Datos de la empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Cargando...
              </div>
            ) : isDemoMode ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                ⚠️ Estás en <strong>modo demo</strong>. Configura Supabase en <code className="bg-amber-100 px-1 rounded">.env.local</code> para guardar datos reales.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre de la empresa</Label>
                    <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="mt-1" />
                  </div>
                  <div>
                    <Label>RUT</Label>
                    <Input value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} placeholder="76.XXX.XXX-X" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Giro comercial</Label>
                  <Input value={form.giro} onChange={e => setForm({...form, giro: e.target.value})} placeholder="Ej: Desarrollo de software y consultoría" className="mt-1" />
                </div>
                <div>
                  <Label>Régimen tributario</Label>
                  <select value={form.regimen_tributario} onChange={e => setForm({...form, regimen_tributario: e.target.value})}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="pro_pyme_general">Pro Pyme General — Impuesto 25%</option>
                    <option value="pro_pyme_transparente">Pro Pyme Transparente — Tributación al socio</option>
                    <option value="general">Régimen General — Impuesto 27%</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Afecta el cálculo de PPM e impuesto a la renta estimado.</p>
                </div>
                <Button onClick={handleGuardar} className="gap-2">
                  {saved ? <><CheckCircle2 className="w-4 h-4" /> ¡Guardado!</> : <><Save className="w-4 h-4" /> Guardar cambios</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variables de entorno */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" /> Conexión Supabase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDemoMode ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isDemoMode ? "bg-red-400" : "bg-green-500"}`} />
              <div>
                <p className={`text-sm font-medium ${isDemoMode ? "text-red-700" : "text-green-700"}`}>
                  {isDemoMode ? "Sin conexión — Modo Demo activo" : "Conectado a Supabase"}
                </p>
                <p className="text-xs text-slate-500">
                  {isDemoMode
                    ? "Los datos no se guardan. Configura .env.local con credenciales reales."
                    : process.env.NEXT_PUBLIC_SUPABASE_URL}
                </p>
              </div>
            </div>

            {isDemoMode && (
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold text-slate-700">Pasos para activar Supabase:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-xs">
                  <li>Crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">supabase.com</a></li>
                  <li>Ve al SQL Editor y ejecuta <code className="bg-slate-200 px-1 rounded">supabase/schema.sql</code></li>
                  <li>Copia la URL y Anon Key de Settings → API</li>
                  <li>Edita <code className="bg-slate-200 px-1 rounded">.env.local</code> con esos valores</li>
                  <li>Reinicia el servidor: <code className="bg-slate-200 px-1 rounded">npm run dev</code></li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" /> Seguridad y cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: "🔐", title: "RLS activado", desc: "Cada empresa solo ve sus propios datos" },
                { icon: "🔑", title: "Auth JWT", desc: "Sesiones seguras con Supabase Auth" },
                { icon: "🛡️", title: "Sin service key expuesta", desc: "Las claves sensibles van en .env.local" },
                { icon: "📱", title: "Política de contraseñas", desc: "Mínimo 8 caracteres (Supabase Auth)" },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="font-medium text-purple-800 text-xs">{item.title}</p>
                    <p className="text-purple-600 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info técnica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" /> Información del sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {[
                { label: "Framework", value: "Next.js 14 (App Router)" },
                { label: "Base de datos", value: "Supabase PostgreSQL" },
                { label: "Auth", value: "Supabase Auth (JWT)" },
                { label: "UI", value: "Tailwind CSS + Radix UI" },
                { label: "Charts", value: "Recharts 2.x" },
                { label: "OCR", value: "Tesseract.js (español)" },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400">{item.label}</p>
                  <p className="font-medium text-slate-700 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
