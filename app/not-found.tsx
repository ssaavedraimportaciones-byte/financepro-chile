import Link from "next/link";
import { TrendingUp } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-6">
          <TrendingUp className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-7xl font-bold text-emerald-400 mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-3">Página no encontrada</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Esta sección de FinancePro no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
