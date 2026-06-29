"use client";

import { cn, getScoreColor } from "@/lib/utils";

interface SecurityScoreGaugeProps {
  score: number;
  loading?: boolean;
}

export function SecurityScoreGauge({ score, loading = false }: SecurityScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  // SVG arc parameters
  const radius = 54;
  const cx = 64;
  const cy = 64;
  const circumference = Math.PI * radius; // half circle
  const dashOffset = circumference * (1 - clampedScore / 100);

  const getLabel = (s: number) => {
    if (s >= 80) return { text: "Good", color: "text-emerald-400" };
    if (s >= 60) return { text: "Fair", color: "text-yellow-400" };
    if (s >= 40) return { text: "At Risk", color: "text-orange-400" };
    return { text: "Critical", color: "text-red-400" };
  };

  const label = getLabel(clampedScore);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <div className="w-32 h-16 bg-slate-800/50 rounded animate-pulse" />
        <div className="w-16 h-4 bg-slate-800/50 rounded animate-pulse mt-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 128 80" className="w-40 overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0 1 ${cx + radius},${cy}`}
          fill="none"
          stroke="rgba(59,130,246,0.1)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0 1 ${cx + radius},${cy}`}
          fill="none"
          stroke={clampedScore >= 80 ? "#22c55e" : clampedScore >= 60 ? "#eab308" : clampedScore >= 40 ? "#f97316" : "#ef4444"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-white" fontSize="24" fontWeight="700">
          {clampedScore}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400" fontSize="9">
          SECURITY SCORE
        </text>
      </svg>
      <span className={cn("text-sm font-semibold mt-1", label.color)}>{label.text}</span>
    </div>
  );
}
