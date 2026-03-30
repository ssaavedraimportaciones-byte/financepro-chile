import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color?: "green" | "red" | "blue" | "orange" | "purple";
  subtitle?: string;
}

const colorMap = {
  green:  { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", border: "border-emerald-200" },
  red:    { bg: "bg-red-50",     icon: "bg-red-100 text-red-600",         border: "border-red-200" },
  blue:   { bg: "bg-blue-50",    icon: "bg-blue-100 text-blue-600",       border: "border-blue-200" },
  orange: { bg: "bg-orange-50",  icon: "bg-orange-100 text-orange-600",   border: "border-orange-200" },
  purple: { bg: "bg-purple-50",  icon: "bg-purple-100 text-purple-600",   border: "border-purple-200" },
};

export function KpiCard({
  title, value, change, changeType = "neutral", icon: Icon, color = "blue", subtitle
}: KpiCardProps) {
  const colors = colorMap[color];
  return (
    <div className={cn("rounded-xl border p-5 flex flex-col gap-3", colors.bg, colors.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-lg", colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {change && (
        <p className={cn("text-xs font-medium", {
          "text-emerald-600": changeType === "up",
          "text-red-600": changeType === "down",
          "text-slate-500": changeType === "neutral",
        })}>
          {changeType === "up" ? "↑ " : changeType === "down" ? "↓ " : ""}
          {change}
        </p>
      )}
    </div>
  );
}
