"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Search, RefreshCw, CheckCircle2, XCircle,
  Timer, Database, User, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { QueryDistributionChart } from "@/components/charts/QueryDistributionChart";
import { formatRelativeTime, truncate, cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types";

interface ActivityRecord {
  id: string;
  dbIdentifier: string;
  queryType: string;
  username: string | null;
  databaseName: string | null;
  queryText: string | null;
  rowsAffected: number | null;
  durationMs: number | null;
  success: boolean;
  errorCode: string | null;
  recordedAt: string;
}

interface ActivityStats {
  totalQueries: number;
  failedQueries: number;
  slowQueries: number;
  queryTypeBreakdown: Array<{ type: string; count: number }>;
  topUsers: Array<{ username: string; queryCount: number }>;
}

const QUERY_TYPE_COLORS: Record<string, string> = {
  SELECT:       "text-blue-400 bg-blue-500/10 border-blue-500/20",
  INSERT:       "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  UPDATE:       "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  DELETE:       "text-red-400 bg-red-500/10 border-red-500/20",
  CREATE_TABLE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  DROP_TABLE:   "text-red-400 bg-red-500/10 border-red-500/20",
  ALTER_TABLE:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  FAILED:       "text-red-400 bg-red-500/10 border-red-500/20",
  OTHER:        "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

function QueryTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-block text-[10px] font-semibold px-2 py-0.5 rounded border",
      QUERY_TYPE_COLORS[type] ?? QUERY_TYPE_COLORS.OTHER
    )}>
      {type.replace("_", " ")}
    </span>
  );
}

export default function DatabaseActivityPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [queryType, setQueryType] = useState("all");
  const [successFilter, setSuccessFilter] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (search) params.set("search", search);
      if (queryType !== "all") params.set("queryType", queryType);
      if (successFilter !== "all") params.set("success", successFilter);

      const res = await fetch(`/api/database-activity?${params}`);
      const json = await res.json();
      if (json.success) {
        setActivities(json.data.activities);
        setStats(json.data.stats);
        setMeta(json.meta);
      }
    } finally { setLoading(false); }
  }, [page, search, queryType, successFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, queryType, successFilter]);

  const chartData = (stats?.queryTypeBreakdown ?? []).map((q) => ({
    type: q.type,
    count: q.count,
    percentage: stats?.totalQueries ? Math.round((q.count / stats.totalQueries) * 100) : 0,
  }));

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Database Activity
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Query-level events and performance metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Queries (24h)", value: stats?.totalQueries ?? 0,  icon: BarChart3,  color: "text-blue-400" },
          { label: "Failed Queries",      value: stats?.failedQueries ?? 0, icon: XCircle,    color: "text-red-400" },
          { label: "Slow Queries (>1s)",  value: stats?.slowQueries ?? 0,   icon: Timer,      color: "text-yellow-400" },
          { label: "Active Users",        value: stats?.topUsers?.length ?? 0, icon: User,    color: "text-emerald-400" },
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Query Distribution</CardTitle></CardHeader>
          <CardContent>
            <QueryDistributionChart data={chartData} loading={loading} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top Users (24h)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-2">
                {(stats?.topUsers ?? []).map((u, i) => {
                  const maxCount = Math.max(...(stats?.topUsers ?? []).map((x) => x.queryCount));
                  return (
                    <div key={u.username} className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 w-5 text-right">{i + 1}</span>
                      <span className="font-mono text-xs text-slate-200 w-32 truncate">{u.username}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-700"
                          style={{ width: `${(u.queryCount / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-10 text-right">{u.queryCount}</span>
                    </div>
                  );
                })}
                {!stats?.topUsers?.length && (
                  <p className="text-sm text-slate-500 text-center py-4">No activity data</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Search user, database, query…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={queryType} onValueChange={setQueryType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Query type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {["SELECT","INSERT","UPDATE","DELETE","CREATE_TABLE","DROP_TABLE","ALTER_TABLE","FAILED"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={successFilter} onValueChange={setSuccessFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Success</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex justify-between">
            <span>Query Events</span>
            {meta && <span className="text-slate-500 font-normal">{meta.total} records</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Database</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : activities.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-500 py-16">
                        No activity found
                      </TableCell>
                    </TableRow>
                  )
                : activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell><QueryTypeBadge type={a.queryType} /></TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs text-slate-200">{a.databaseName ?? "—"}</p>
                          <p className="text-[10px] text-slate-500">{a.dbIdentifier}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">{a.username ?? "—"}</TableCell>
                      <TableCell>
                        <code className="text-[10px] text-slate-400 font-mono">
                          {a.queryText ? truncate(a.queryText, 60) : "—"}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">{a.rowsAffected ?? "—"}</TableCell>
                      <TableCell>
                        {a.durationMs != null ? (
                          <span className={cn(
                            "text-xs",
                            a.durationMs > 1000 ? "text-red-400" :
                            a.durationMs > 500  ? "text-yellow-400" : "text-slate-400"
                          )}>
                            {a.durationMs.toFixed(0)}ms
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {a.success
                          ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />OK</span>
                          : <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" />{a.errorCode ?? "Err"}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{formatRelativeTime(a.recordedAt)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {meta && <Pagination meta={meta} onPageChange={setPage} />}
        </CardContent>
      </Card>
    </div>
  );
}
