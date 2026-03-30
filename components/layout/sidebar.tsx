"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Scale, Receipt, Cpu, Truck, Users,
  UserCircle, FolderKanban, ScanLine, PiggyBank, LogOut,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Settings,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",        label: "Dashboard",         icon: LayoutDashboard },
      { href: "/ingresos",         label: "Ingresos",          icon: TrendingUp },
      { href: "/gastos",           label: "Gastos Generales",  icon: TrendingDown },
    ],
  },
  {
    label: "Módulos",
    items: [
      { href: "/tributario",       label: "Tributario (SII)",  icon: Receipt },
      { href: "/capital-humano",   label: "Capital Humano",    icon: Users },
      { href: "/proyectos",        label: "Proyectos",         icon: FolderKanban },
      { href: "/fundador",         label: "Valor Fundador",    icon: UserCircle },
    ],
  },
  {
    label: "Costos",
    items: [
      { href: "/formalizacion",    label: "Formalización",     icon: Scale },
      { href: "/tecnologia",       label: "Tecnología",        icon: Cpu },
      { href: "/operativo",        label: "Operativo",         icon: Truck },
      { href: "/fondo-emergencia", label: "Fondo Emergencia",  icon: PiggyBank },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { href: "/ocr",              label: "OCR Documentos",    icon: ScanLine },
      { href: "/configuracion",    label: "Configuración",     icon: Settings },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/mi-cuenta",        label: "Mi Cuenta / Plan",  icon: CreditCard },
    ],
  },
];

interface SidebarProps {
  demoMode?: boolean;
}

export function Sidebar({ demoMode }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 relative flex-shrink-0",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700/60">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm shadow">
          FP
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-base tracking-tight">FinancePro</span>
            {demoMode && (
              <span className="block text-[10px] text-amber-400 leading-none mt-0.5">Modo Demo</span>
            )}
          </div>
        )}
      </div>

      {/* Botón colapsar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 bg-slate-700 hover:bg-slate-600 rounded-full p-0.5 text-white shadow transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Nav con grupos */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all mx-2 rounded-lg mb-0.5",
                    active
                      ? "bg-emerald-600/20 text-emerald-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5 mx-auto" : "w-4 h-4")} />
                  {!collapsed && <span>{label}</span>}
                  {active && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-700/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors w-full px-2 py-2 rounded-lg hover:bg-slate-800"
        >
          <LogOut className={cn("flex-shrink-0", collapsed ? "w-5 h-5 mx-auto" : "w-4 h-4")} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
