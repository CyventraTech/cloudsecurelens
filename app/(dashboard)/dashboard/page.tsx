"use client";

import {
  Shield, Users, Database, XCircle,
  AlertTriangle, Key, RefreshCw, Wifi,
  CheckCircle2, AlertCircle
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SecurityScoreGauge } from "@/components/dashboard/SecurityScoreGauge";
import { LoginTrendChart } from "@/components/charts/LoginTrendChart";
import { QueryDistributionChart } from "@/components/charts/QueryDistributionChart";
import { TopSourceIpsChart } from "@/components/charts/TopSourceIpsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">Failed to load dashboard</p>
        </div>
        <p className="text-sm text-slate-500">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const stats = data?.stats;
  const charts = data?.charts;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Security Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            AWS account security posture at a glance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Top row: Score + key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Security Score — spans 2 cols */}
        <Card className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center py-4 px-5">
          <CardHeader className="pb-2 w-full">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <SecurityScoreGauge score={stats?.securityScore ?? 0} loading={loading} />
          </CardContent>
        </Card>

        {/* Stat cards */}
        <StatCard
          title="IAM Users"
          value={stats?.totalIamUsers ?? 0}
          subtitle={`${stats?.mfaDisabledUsers ?? 0} without MFA`}
          icon={Users}
          variant={stats?.mfaDisabledUsers ? "warning" : "success"}
          loading={loading}
        />
        <StatCard
          title="Aurora Databases"
          value={stats?.auroraDatabases ?? 0}
          subtitle={`${stats?.publicDatabases ?? 0} publicly accessible`}
          icon={Database}
          variant={stats?.publicDatabases ? "critical" : "default"}
          loading={loading}
        />
        <StatCard
          title="Failed Logins (24h)"
          value={stats?.failedLoginsLast24h ?? 0}
          subtitle="Last 24 hours"
          icon={XCircle}
          variant={stats?.failedLoginsLast24h ? "critical" : "success"}
          loading={loading}
        />
        <StatCard
          title="Open Alerts"
          value={stats?.openRecommendations ?? 0}
          subtitle={`${stats?.criticalAlerts ?? 0} critical`}
          icon={AlertTriangle}
          variant={stats?.criticalAlerts ? "critical" : "warning"}
          loading={loading}
        />
      </div>

      {/* Security posture flags */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SecurityFlag
          label="Root Account Used"
          active={stats?.rootAccountUsage ?? false}
          icon={AlertTriangle}
          severity="critical"
          loading={loading}
          activeText="Used in last 30d"
          safeText="Not used recently"
        />
        <SecurityFlag
          label="MFA Coverage"
          active={!!(stats?.mfaDisabledUsers && stats.mfaDisabledUsers > 0)}
          icon={Shield}
          severity="high"
          loading={loading}
          activeText={`${stats?.mfaDisabledUsers ?? 0} users without MFA`}
          safeText="All users have MFA"
        />
        <SecurityFlag
          label="Public Databases"
          active={!!(stats?.publicDatabases && stats.publicDatabases > 0)}
          icon={Wifi}
          severity="critical"
          loading={loading}
          activeText={`${stats?.publicDatabases ?? 0} exposed to internet`}
          safeText="No public databases"
        />
        <SecurityFlag
          label="Stale Access Keys"
          active={!!(stats?.accessKeysUnrotated && stats.accessKeysUnrotated > 0)}
          icon={Key}
          severity="high"
          loading={loading}
          activeText={`${stats?.accessKeysUnrotated ?? 0} keys >90 days old`}
          safeText="All keys rotated"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Login Trend — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Login Activity — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginTrendChart
              data={charts?.loginTrend ?? []}
              failedData={charts?.failedLoginTrend ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Query Distribution — 1/3 width */}
        <Card>
          <CardHeader>
            <CardTitle>Query Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryDistributionChart
              data={charts?.queryTypeDistribution ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Source IPs */}
        <Card>
          <CardHeader>
            <CardTitle>Top Source IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSourceIpsChart
              data={charts?.topSourceIps ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Quick summary */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <RecommendationSummary stats={stats} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Security flag tile ────────────────────────────────────────────────────────
function SecurityFlag({
  label,
  active,
  icon: Icon,
  severity,
  loading,
  activeText,
  safeText,
}: {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  severity: "critical" | "high";
  loading: boolean;
  activeText: string;
  safeText: string;
}) {
  if (loading) {
    return <Skeleton className="h-20 rounded-xl" />;
  }

  return (
    <div className={cn(
      "glass-card p-4 flex flex-col gap-2",
      active && severity === "critical" && "border-red-500/25 bg-red-500/5",
      active && severity === "high" && "border-orange-500/25 bg-orange-500/5",
      !active && "border-emerald-500/15 bg-emerald-500/5"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {active ? (
          <Badge variant={severity === "critical" ? "critical" : "high"}>
            {severity}
          </Badge>
        ) : (
          <Badge variant="success">OK</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {active ? (
          <AlertCircle className={cn("w-4 h-4 shrink-0", severity === "critical" ? "text-red-400" : "text-orange-400")} />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <span className={cn(
          "text-xs",
          active
            ? severity === "critical" ? "text-red-300" : "text-orange-300"
            : "text-emerald-300"
        )}>
          {active ? activeText : safeText}
        </span>
      </div>
    </div>
  );
}

// ── Recommendation summary ────────────────────────────────────────────────────
interface RecommendationSummaryProps {
  stats: {
    securityScore: number;
    totalIamUsers: number;
    mfaDisabledUsers: number;
    auroraDatabases: number;
    publicDatabases: number;
    failedLoginsLast24h: number;
    criticalAlerts: number;
    openRecommendations: number;
    rootAccountUsage: boolean;
    accessKeysUnrotated: number;
  } | null | undefined;
  loading: boolean;
}

function RecommendationSummary({ stats, loading }: RecommendationSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Critical", count: stats?.criticalAlerts ?? 0, color: "text-red-400", bg: "bg-red-500/10", bar: "bg-red-500" },
    { label: "High", count: 0, color: "text-orange-400", bg: "bg-orange-500/10", bar: "bg-orange-500" },
    { label: "Medium", count: 0, color: "text-yellow-400", bg: "bg-yellow-500/10", bar: "bg-yellow-500" },
    { label: "Low", count: 0, color: "text-blue-400", bg: "bg-blue-500/10", bar: "bg-blue-500" },
  ];

  const total = stats?.openRecommendations ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-slate-400">Open recommendations</span>
        <span className="text-white font-semibold">{total}</span>
      </div>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className={cn("text-xs font-medium w-14", item.color)}>{item.label}</span>
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", item.bar)}
              style={{ width: total > 0 ? `${(item.count / total) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-xs text-slate-400 w-6 text-right">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
