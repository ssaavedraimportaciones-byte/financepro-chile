"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCLP } from "@/lib/formatters";

const COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

interface DataPoint {
  categoria: string;
  monto: number;
  porcentaje?: number;
}

interface Props {
  data: DataPoint[];
}

const CATEGORIAS_ES: Record<string, string> = {
  formalizacion: "Formalización",
  tecnologia: "Tecnología",
  operativo: "Operativo",
  capital_humano: "Capital Humano",
  tributario: "Tributario",
  marketing: "Marketing",
  arriendo: "Arriendo",
  otro: "Otro",
};

export function DistribucionCostosChart({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    name: CATEGORIAS_ES[d.categoria] ?? d.categoria,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="monto"
          nameKey="name"
          paddingAngle={2}
        >
          {formatted.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCLP(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
