"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TrendDataPoint } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface LoginTrendChartProps {
  data: TrendDataPoint[];
  failedData?: TrendDataPoint[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function LoginTrendChart({ data, failedData, loading = false }: LoginTrendChartProps) {
  if (loading) {
    return <Skeleton className="w-full h-[220px]" />;
  }

  // Merge success + failed into one series
  const merged = data.map((d, i) => ({
    date: d.date,
    Successful: d.value,
    Failed: failedData?.[i]?.value ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={merged} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "11px", color: "#64748b", paddingTop: "8px" }}
        />
        <Area
          type="monotone"
          dataKey="Successful"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#gradSuccess)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="Failed"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#gradFailed)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
