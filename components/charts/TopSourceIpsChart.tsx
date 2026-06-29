"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface TopSourceIpsChartProps {
  data: Array<{ ip: string; count: number }>;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-slate-300 font-mono">{label}</p>
      <p className="text-blue-400 font-medium">{payload[0].value} events</p>
    </div>
  );
};

export function TopSourceIpsChart({ data, loading = false }: TopSourceIpsChartProps) {
  if (loading) return <Skeleton className="w-full h-[200px]" />;
  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">
        No IP data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="ip"
          tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.count === maxCount ? "#ef4444" : "#3b82f6"}
              fillOpacity={0.7 + (d.count / maxCount) * 0.3}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
