import Link from "next/link";
import { TrendingUp, LayoutDashboard, ArrowLeft } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="bg-slate-900 text-white px-6 py-3 flex items-center gap-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-sm">FP</div>
          <span className="font-bold text-base">FinancePro</span>
          <span className="bg-amber-500 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">ADMIN</span>
        </div>

        <div className="flex items-center gap-6 ml-8 text-sm text-slate-400">
          <Link href="/admin" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Panel Admin
          </Link>
        </div>

        <div className="ml-auto">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
          </Link>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
