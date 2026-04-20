"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Building2, Users, TrendingUp, Clock, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Search,
  Crown, DollarSign, Zap, Copy, Lock, Unlock, ShieldOff,
  ChevronDown, CalendarPlus, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Tipos ── */
interface EmpresaAdmin {
  id: string;
  nombre: string;
  rut: string;
  email?: string | null;
  created_at: string;
  plan: string | null;
  estado: string | null;
  fecha_fin: string | null;
  bloqueado: boolean | null;
}

interface Stats {
  total: number;
  enTrial: number;
  activos: number;
  vencidas: number;
  mrr: number;
}

const PRECIOS_PLAN: Record<string, number> = {
  starter: 19990, professional: 39990, enterprise: 79990,
};

const PLANES_LIST = ["starter", "professional", "enterprise"];
const ESTADOS_LIST = ["trial", "activa", "vencida", "cancelada", "pausada"];

/* ── Demo data ── */
const DEMO_EMPRESAS: EmpresaAdmin[] = [
  { id: "1", nombre: "Demo SpA", rut: "76.123.456-7", email: "demo@empresa.cl", created_at: "2026-03-01", plan: "professional", estado: "trial", fecha_fin: new Date(Date.now() + 9 * 86400000).toISOString(), bloqueado: false },
  { id: "2", nombre: "TechSolutions Ltda", rut: "76.234.567-8", email: "tech@solutions.cl", created_at: "2026-02-15", plan: "starter", estado: "activa", fecha_fin: new Date(Date.now() + 22 * 86400000).toISOString(), bloqueado: false },
  { id: "3", nombre: "Consultora Norte SpA", rut: "76.345.678-9", email: "admin@consultoranorte.cl", created_at: "2026-01-20", plan: "enterprise", estado: "activa", fecha_fin: new Date(Date.now() + 15 * 86400000).toISOString(), bloqueado: false },
  { id: "4", nombre: "Marketing Sur Ltda", rut: "76.456.789-0", email: "contacto@marketingsur.cl", created_at: "2026-03-06", plan: "professional", estado: "trial", fecha_fin: new Date(Date.now() + 2 * 86400000).toISOString(), bloqueado: false },
  { id: "5", nombre: "Startup Valparaíso", rut: "76.567.890-1", email: "hola@startupvalpo.cl", created_at: "2026-02-01", plan: "starter", estado: "vencida", fecha_fin: new Date(Date.now() - 5 * 86400000).toISOString(), bloqueado: true },
  { id: "6", nombre: "Importadora Centro", rut: "76.678.901-2", email: "finanzas@importadora.cl", created_at: "2026-01-10", plan: "professional", estado: "activa", fecha_fin: new Date(Date.now() + 8 * 86400000).toISOString(), bloqueado: false },
  { id: "7", nombre: "Coderhouse Chile", rut: "76.789.012-3", email: "ops@coderhouse.cl", created_at: "2026-03-07", plan: "professional", estado: "trial", fecha_fin: new Date(Date.now() + 13 * 86400000).toISOString(), bloqueado: false },
];

const DEMO_STATS: Stats = { total: 7, enTrial: 3, activos: 3, vencidas: 1, mrr: 19990 + 79990 + 39990 };

/* ── Helpers ── */
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? "financepro-admin-2026";

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

function diasRestantes(fecha: string | null): number {
  if (!fecha) return 0;
  return Math.max(0, Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000));
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter:      { label: "Starter",      color: "bg-slate-100 text-slate-700" },
  professional: { label: "Professional", color: "bg-emerald-100 text-emerald-700" },
  enterprise:   { label: "Enterprise",   color: "bg-violet-100 text-violet-700" },
};

const ESTADO_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  trial:     { label: "Trial",     color: "bg-amber-100 text-amber-700",   icon: Clock },
  activa:    { label: "Activa",    color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  vencida:   { label: "Vencida",   color: "bg-red-100 text-red-700",       icon: XCircle },
  cancelada: { label: "Cancelada", color: "bg-slate-100 text-slate-500",   icon: XCircle },
  pausada:   { label: "Pausada",   color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

/* ── Componente gestión por fila ── */
function GestionPanel({
  empresa,
  adminKey,
  isDemoMode,
  onUpdate,
  onClose,
}: {
  empresa: EmpresaAdmin;
  adminKey: string;
  isDemoMode: boolean;
  onUpdate: (id: string, patch: Partial<EmpresaAdmin>) => void;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState(empresa.plan ?? "professional");
  const [estado, setEstado] = useState(empresa.estado ?? "activa");
  const [saving, setSaving] = useState(false);
  const [extendando, setExtendando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function callApi(body: object) {
    if (isDemoMode) return true;
    const res = await fetch("/api/admin/update-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  async function handleGuardarPlan() {
    setSaving(true);
    setMsg(null);
    const ok = await callApi({ empresaId: empresa.id, plan, estado });
    if (ok) {
      onUpdate(empresa.id, { plan, estado });
      setMsg("Plan actualizado ✓");
    } else {
      setMsg("Error al guardar");
    }
    setSaving(false);
  }

  async function handleExtenderTrial() {
    setExtendando(true);
    setMsg(null);
    const ok = await callApi({ empresaId: empresa.id, extenderTrial: true, dias: 14 });
    if (ok) {
      onUpdate(empresa.id, { estado: "trial" });
      setMsg("Trial extendido +14 días ✓");
    } else {
      setMsg("Error al extender");
    }
    setExtendando(false);
  }

  return (
    <tr className="bg-slate-50 border-b border-slate-200">
      <td colSpan={9} className="px-4 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">Plan</p>
            <select
              value={plan}
              onChange={e => setPlan(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {PLANES_LIST.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">Estado</p>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {ESTADOS_LIST.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGuardarPlan}
            disabled={saving}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Guardar plan
          </button>
          <button
            onClick={handleExtenderTrial}
            disabled={extendando}
            className="h-9 px-4 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {extendando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
            Extender trial +14d
          </button>
          <button
            onClick={onClose}
            className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-lg transition-colors"
          >
            Cerrar
          </button>
          {msg && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-lg",
              msg.includes("✓") ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
            )}>
              {msg}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Componente principal ── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [keyError, setKeyError] = useState(false);

  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingBlock, setLoadingBlock] = useState<string | null>(null);
  const [gestionando, setGestionando] = useState<string | null>(null);

  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  const loadData = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 600));
      setEmpresas(DEMO_EMPRESAS);
      setStats(DEMO_STATS);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/stats", { headers: { "x-admin-key": ADMIN_KEY } });
      if (res.ok) {
        const data = await res.json();
        setEmpresas(data.empresas ?? []);
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [isDemoMode]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (adminKey === ADMIN_KEY) { setAuthed(true); setKeyError(false); }
    else setKeyError(true);
  }

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleToggleBloqueo(empresaId: string, currentBloqueado: boolean) {
    if (isDemoMode) {
      setEmpresas(prev => prev.map(e => e.id === empresaId ? { ...e, bloqueado: !currentBloqueado } : e));
      return;
    }
    setLoadingBlock(empresaId);
    try {
      const res = await fetch("/api/admin/update-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ empresaId, bloqueado: !currentBloqueado }),
      });
      if (res.ok) setEmpresas(prev => prev.map(e => e.id === empresaId ? { ...e, bloqueado: !currentBloqueado } : e));
    } catch (err) { console.error(err); }
    setLoadingBlock(null);
  }

  function handleEmpresaUpdate(id: string, patch: Partial<EmpresaAdmin>) {
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  /* ── Login admin ── */
  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Panel de Administración</h1>
            <p className="text-slate-500 text-sm mt-1">Ingresa la clave de acceso admin</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Clave admin..."
              className={cn(
                "w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500",
                keyError ? "border-red-400 bg-red-50" : "border-slate-300"
              )}
            />
            {keyError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Clave incorrecta
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              Acceder
            </button>
          </form>
          {isDemoMode && (
            <p className="text-xs text-center text-slate-400 mt-4">
              Demo: clave es <code className="bg-slate-100 px-1 rounded">financepro-admin-2026</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Filtros ── */
  const empresasFiltradas = empresas.filter(e => {
    const matchSearch = !search ||
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (e.rut ?? "").includes(search) ||
      (e.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === "todos" || e.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  /* ── Dashboard admin ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de clientes y métricas de negocio
            {isDemoMode && <span className="text-amber-600 font-medium"> · Datos demo</span>}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 text-sm border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">Total empresas</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500 font-medium">En trial</span>
            </div>
            <p className="text-3xl font-bold text-amber-500">{stats.enTrial}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-500 font-medium">Clientes activos</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.activos}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-500 font-medium">Vencidos / cancelados</span>
            </div>
            <p className="text-3xl font-bold text-red-500">{stats.vencidas}</p>
          </div>
          <div className="bg-emerald-600 rounded-xl p-4 text-white col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-200" />
              <span className="text-xs text-emerald-200 font-medium">MRR</span>
            </div>
            <p className="text-2xl font-bold">{formatCLP(stats.mrr)}</p>
            <p className="text-emerald-200 text-[10px] mt-1">ARR: {formatCLP(stats.mrr * 12)}</p>
          </div>
        </div>
      )}

      {/* Proyección */}
      {stats && stats.enTrial > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-800">
            <strong>{stats.enTrial} empresa{stats.enTrial > 1 ? "s" : ""} en trial</strong> —
            Si convierten al plan Professional, el MRR subiría en{" "}
            <strong>{formatCLP(stats.enTrial * 39990)}</strong>/mes.
            Tasa de conversión actual:{" "}
            <strong>{stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0}%</strong>.
          </div>
        </div>
      )}

      {/* Tabla de empresas */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RUT o email..."
              className="flex-1 text-sm outline-none placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["todos", "trial", "activa", "vencida", "cancelada"].map(estado => (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado)}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-lg capitalize transition-colors",
                  filterEstado === estado ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {estado === "todos" ? "Todos" : estado}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mr-3" />
            <span className="text-slate-500 text-sm">Cargando datos...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa / Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Días rest.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor/mes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Registro</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acceso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Gestión</th>
                </tr>
              </thead>
              <tbody>
                {empresasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No se encontraron empresas con esos filtros
                    </td>
                  </tr>
                ) : (
                  empresasFiltradas.map((e, i) => {
                    const plan = PLAN_LABELS[e.plan ?? ""] ?? { label: e.plan ?? "—", color: "bg-slate-100 text-slate-600" };
                    const estado = ESTADO_LABELS[e.estado ?? ""] ?? { label: e.estado ?? "—", color: "bg-slate-100 text-slate-500", icon: AlertTriangle };
                    const EstadoIcon = estado.icon;
                    const dias = e.fecha_fin ? diasRestantes(e.fecha_fin) : null;
                    const diasUrgente = dias !== null && dias <= 3 && (e.estado === "trial" || e.estado === "activa");
                    const estaBloqueado = e.bloqueado === true;
                    const isGestionando = gestionando === e.id;

                    return (
                      <>
                        <tr key={e.id} className={cn(
                          "border-b border-slate-50 hover:bg-slate-50 transition-colors",
                          estaBloqueado ? "bg-red-50/60" : (i % 2 === 0 ? "" : "bg-slate-50/30"),
                          isGestionando ? "bg-emerald-50/40" : ""
                        )}>
                          {/* Empresa / Email */}
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-1.5">
                              {estaBloqueado && <ShieldOff className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                              <div>
                                <p className={cn("font-semibold", estaBloqueado ? "text-red-700" : "text-slate-900")}>{e.nombre}</p>
                                <p className="text-xs text-slate-400">{e.rut}</p>
                                {e.email && (
                                  <p className="text-xs text-slate-500 mt-0.5">{e.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Plan */}
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", plan.color)}>
                              {plan.label}
                            </span>
                          </td>
                          {/* Estado */}
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", estado.color)}>
                              <EstadoIcon className="w-3 h-3" />{estado.label}
                            </span>
                          </td>
                          {/* Días restantes */}
                          <td className="px-4 py-3">
                            {dias !== null ? (
                              <span className={cn("font-bold text-sm", diasUrgente ? "text-red-500" : "text-slate-700")}>
                                {dias === 0 ? "¡Hoy!" : `${dias}d`}
                                {diasUrgente && " ⚠️"}
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          {/* Valor/mes */}
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {e.estado === "activa"
                              ? formatCLP(PRECIOS_PLAN[e.plan ?? ""] ?? 0)
                              : <span className="text-slate-300 text-xs">—</span>
                            }
                          </td>
                          {/* Registro */}
                          <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(e.created_at)}</td>
                          {/* ID */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => copyId(e.id)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors font-mono"
                              title="Copiar ID"
                            >
                              {copied === e.id
                                ? <><CheckCircle2 className="w-3 h-3 text-green-500" /> Copiado</>
                                : <><Copy className="w-3 h-3" /> {e.id.slice(0, 8)}…</>
                              }
                            </button>
                          </td>
                          {/* Acceso */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleBloqueo(e.id, estaBloqueado)}
                              disabled={loadingBlock === e.id}
                              title={estaBloqueado ? "Desbloquear acceso" : "Bloquear acceso"}
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50",
                                estaBloqueado
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-100 text-red-600 hover:bg-red-200"
                              )}
                            >
                              {loadingBlock === e.id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : estaBloqueado
                                  ? <><Unlock className="w-3 h-3" /> Desbloquear</>
                                  : <><Lock className="w-3 h-3" /> Bloquear</>
                              }
                            </button>
                          </td>
                          {/* Gestión */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setGestionando(isGestionando ? null : e.id)}
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all",
                                isGestionando
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              <Settings2 className="w-3 h-3" />
                              <ChevronDown className={cn("w-3 h-3 transition-transform", isGestionando && "rotate-180")} />
                            </button>
                          </td>
                        </tr>
                        {isGestionando && (
                          <GestionPanel
                            key={`gestion-${e.id}`}
                            empresa={e}
                            adminKey={ADMIN_KEY}
                            isDemoMode={isDemoMode}
                            onUpdate={handleEmpresaUpdate}
                            onClose={() => setGestionando(null)}
                          />
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer tabla */}
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
          <span>{empresasFiltradas.length} de {empresas.length} empresas</span>
          <span>
            MRR filtrado:{" "}
            <strong className="text-slate-600">
              {formatCLP(
                empresasFiltradas
                  .filter(e => e.estado === "activa")
                  .reduce((sum, e) => sum + (PRECIOS_PLAN[e.plan ?? ""] ?? 0), 0)
              )}
            </strong>
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="mailto:hola@financepro.cl?subject=Seguimiento trial"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Email a trials</p>
              <p className="text-xs text-slate-500">Enviar seguimiento a usuarios en trial</p>
            </div>
          </div>
        </a>

        <a
          href="mailto:hola@financepro.cl?subject=Reactivar cuenta vencida"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-red-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Recuperar vencidos</p>
              <p className="text-xs text-slate-500">Contactar cuentas vencidas o canceladas</p>
            </div>
          </div>
        </a>

        <a
          href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <TrendingUp className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Panel Supabase</p>
              <p className="text-xs text-slate-500">Ver base de datos y autenticación</p>
            </div>
          </div>
        </a>
      </div>

      {isDemoMode && (
        <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
          🚧 Mostrando datos de demostración. Configura{" "}
          <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
          <code className="bg-amber-100 px-1 rounded">.env.local</code> para ver datos reales.
        </p>
      )}
    </div>
  );
}
