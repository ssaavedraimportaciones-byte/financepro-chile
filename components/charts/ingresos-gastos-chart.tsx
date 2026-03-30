"use client";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatNumero } from "@/lib/formatters";

interface DataPoint {
  mes: string;
  ingresos: number;
  gastos: number;
  utilidad: number;
}

interface Props {
  data: DataPoint[];
}

const tooltipFormatter = (value: number) => `$${formatNumero(value)}`;

export function IngresosGastosChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={tooltipFormatter} />
        <Legend />
        <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
        <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4,4,0,0]} />
        <Line
          type="monotone"
          dataKey="utilidad"
          name="Utilidad"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
