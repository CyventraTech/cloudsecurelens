"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lightbulb, Search, RefreshCw, CheckCircle2,
  Clock, AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { getSeverityColor, formatRelativeTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PaginationMeta } from "@/types";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  resource: string | null;
  resourceType: string | null;
  status: string;
  remediation: string | null;
  awsDocUrl: string | null;
  createdAt: string;
}

interface RecStats {
  total: number; open: number; inProgress: number; resolved: number;
  critical: number; high: number; medium: number; low: number;
}

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, "critical" | "high" | "medium" | "low"> = {
    CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
  };
  return <Badge variant={map[severity] ?? "outline"}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN:        "text-red-400 bg-red-500/10 border-red-500/20",
    IN_PROGRESS: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    RESOLVED:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    IGNORED:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded border", map[status] ?? map.OPEN)}>
      {status.replace("_", " ")}
    </span>
  );
}

function RecommendationCard({
  rec,
  onStatusChange,
}: {
  rec: Recommendation;
  onStatusChange: (id: string, status: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleStatus(status: string) {
    setUpdating(true);
    await onStatusChange(rec.id, status);
    setUpdating(false);
  }

  return (
    <div className={cn(
      "glass-card overflow-hidden transition-all",
      rec.severity === "CRITICAL" && rec.status === "OPEN" && "border-red-500/25",
      rec.severity === "HIGH" && rec.status === "OPEN" && "border-orange-500/20",
    )}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Severity indicator */}
        <div className={cn(
          "w-1 self-stretch rounded-full shrink-0",
          rec.severity === "CRITICAL" ? "bg-red-500" :
          rec.severity === "HIGH"     ? "bg-orange-500" :
          rec.severity === "MEDIUM"   ? "bg-yellow-500" : "bg-blue-500"
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white leading-tight">{rec.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <SeverityBadge severity={rec.severity} />
              <StatusBadge status={rec.status} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{rec.description}</p>

          <div className="flex items-center gap-4 mt-2">
            {rec.resource && (
              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[240px]">
                {rec.resource}
              </span>
            )}
            {rec.resourceType && (
              <Badge variant="outline" className="text-[10px]">{rec.resourceType}</Badge>
            )}
            <span className="text-[10px] text-slate-600 ml-auto">
              {formatRelativeTime(rec.createdAt)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 mt-0.5"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-blue-500/10 pt-3 space-y-3">
          {rec.remediation && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Remediation</p>
              <p className="text-xs text-slate-300 bg-[#050b14]/50 rounded p-2.5">{rec.remediation}</p>
            </div>
          )}
          {rec.awsDocUrl && (
            <a
              href={rec.awsDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              AWS Documentation
            </a>
          )}

          {/* Status actions */}
          {rec.status !== "RESOLVED" && (
            <div className="flex items-center gap-2 pt-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Update Status:</p>
              {rec.status === "OPEN" && (
                <Button size="sm" variant="outline" onClick={() => handleStatus("IN_PROGRESS")} disabled={updating}>
                  <Clock className="w-3.5 h-3.5 mr-1.5" /> Mark In Progress
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleStatus("RESOLVED")} disabled={updating} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Resolved
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleStatus("IGNORED")} disabled={updating}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Ignore
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<RecStats | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (severity !== "all") params.set("severity", severity);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/recommendations?${params}`);
      const json = await res.json();
      if (json.success) {
        setRecommendations(json.data.recommendations);
        setStats(json.data.stats);
        setMeta(json.meta);
      }
    } finally { setLoading(false); }
  }, [page, search, severity, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, severity, status]);

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Status updated");
        load();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  }

  const openPct = stats?.total ? Math.round((stats.open / stats.total) * 100) : 0;

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-400" />
            Security Recommendations
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">AI-generated security findings and remediation steps</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: stats?.total ?? 0,      icon: Lightbulb,   color: "text-blue-400" },
          { label: "Critical",    value: stats?.critical ?? 0,   icon: AlertTriangle, color: "text-red-400" },
          { label: "Open",        value: stats?.open ?? 0,       icon: XCircle,     color: "text-orange-400" },
          { label: "Resolved",    value: stats?.resolved ?? 0,   icon: CheckCircle2, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <s.icon className={cn("w-5 h-5 shrink-0", s.color)} />
            <div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Severity breakdown */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Open Findings by Severity</span>
            <span className="text-xs text-slate-500">{stats?.open ?? 0} open / {stats?.total ?? 0} total</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Critical", value: stats?.critical ?? 0, color: "bg-red-500", text: "text-red-400" },
              { label: "High",     value: stats?.high ?? 0,     color: "bg-orange-500", text: "text-orange-400" },
              { label: "Medium",   value: stats?.medium ?? 0,   color: "bg-yellow-500", text: "text-yellow-400" },
              { label: "Low",      value: stats?.low ?? 0,      color: "bg-blue-500", text: "text-blue-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={cn("text-2xl font-bold", s.text)}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Progress value={openPct} className="h-1.5" indicatorClassName="bg-orange-500" />
            <p className="text-[10px] text-slate-500 mt-1">{openPct}% of recommendations are unresolved</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Search title, resource…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {SEVERITY_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="IGNORED">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation cards */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : recommendations.length === 0
          ? (
              <div className="glass-card p-12 flex flex-col items-center gap-3 text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
                <p className="font-medium text-slate-300">No recommendations found</p>
                <p className="text-sm">
                  {status === "OPEN" ? "Great — no open findings!" : "Try adjusting your filters."}
                </p>
              </div>
            )
          : recommendations.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} onStatusChange={handleStatusChange} />
            ))}
      </div>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
