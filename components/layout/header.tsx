"use client";
import { Bell, Search } from "lucide-react";
import { getMesActual } from "@/lib/formatters";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const mes = getMesActual();
  const [year, month] = mes.split("-");
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const mesNombre = meses[parseInt(month) - 1];

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">{mesNombre} {year}</span>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
          />
        </div>
        <button className="relative p-2 text-slate-500 hover:text-slate-700">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
