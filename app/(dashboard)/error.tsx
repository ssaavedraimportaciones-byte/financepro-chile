"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Error al cargar el módulo</h2>
        <p className="text-slate-500 text-sm mb-4">
          {error.message?.includes("supabase") || error.message?.includes("URL")
            ? "No se pudo conectar a Supabase. Verifica tu .env.local y reinicia el servidor."
            : error.message || "Ocurrió un error inesperado."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline" size="sm">Reintentar</Button>
          <Button onClick={() => window.location.href = "/dashboard"} size="sm">Ir al Dashboard</Button>
        </div>
      </div>
    </div>
  );
}
