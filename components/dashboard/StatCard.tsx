import { cn, getScoreColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "critical" | "success" | "warning" | "score";
  loading?: boolean;
}

const variantStyles = {
  default:  "border-blue-500/15 bg-[#0d1829]/80",
  critical: "border-red-500/20 bg-red-500/5",
  success:  "border-emerald-500/20 bg-emerald-500/5",
  warning:  "border-yellow-500/20 bg-yellow-500/5",
  score:    "border-blue-500/20 bg-blue-500/5",
};

const iconStyles = {
  default:  "text-blue-400 bg-blue-500/10",
  critical: "text-red-400 bg-red-500/10",
  success:  "text-emerald-400 bg-emerald-500/10",
  warning:  "text-yellow-400 bg-yellow-500/10",
  score:    "text-blue-400 bg-blue-500/10",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("glass-card p-5", variantStyles[variant])}>
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-8 w-20 rounded mb-1" />
        <Skeleton className="h-3 w-28 rounded" />
      </div>
    );
  }

  const isScore = variant === "score" && typeof value === "number";

  return (
    <div className={cn("glass-card p-5 hover:border-blue-500/30 transition-colors", variantStyles[variant])}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", iconStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            trend.value > 0
              ? variant === "critical" ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10"
              : "text-slate-400 bg-slate-500/10"
          )}>
            {trend.value > 0 ? "↑" : "↓"} {Math.abs(trend.value)}
          </span>
        )}
      </div>

      <div className={cn(
        "text-3xl font-bold tracking-tight mb-0.5",
        isScore ? getScoreColor(value as number) : "text-white"
      )}>
        {isScore ? `${value}` : value}
        {isScore && <span className="text-lg font-medium text-slate-400">/100</span>}
      </div>

      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      {trend && <p className="text-xs text-slate-500 mt-1">{trend.label}</p>}
    </div>
  );
}
