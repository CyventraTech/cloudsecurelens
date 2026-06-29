"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface QueryDistributionChartProps {
  data: Array<{ type: string; count: number; percentage: number }>;
  loading?: boolean;
}

const COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-white font-medium">{d.name}</p>
      <p className="text-slate-400">{d.value} queries ({d.payload.percentage}%)</p>
    </div>
  );
};

export function QueryDistributionChart({ data, loading = false }: QueryDistributionChartProps) {
  if (loading) return <Skeleton className="w-full h-[220px]" />;
  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">
        No query data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="type"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "10px", color: "#64748b" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
