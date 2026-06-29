"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ScrollText, Search, Filter, RefreshCw, UserPlus, UserMinus,
  DatabaseZap as DatabasePlusIcon, DatabaseBackup, Clock, User, Cpu, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime, formatRelativeTime, cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types";

interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string;
  actorEmail: string | null;
}

// Visual config per action type.
const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof UserPlus; className: string }
> = {
  IAM_USER_ADDED: {
    label: "IAM User Added",
    icon: UserPlus,
    className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  IAM_USER_REMOVED: {
    label: "IAM User Removed",
    icon: UserMinus,
    className: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  DB_ADDED: {
    label: "Database Added",
    icon: DatabasePlusIcon,
    className: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  DB_REMOVED: {
    label: "Database Removed",
    icon: DatabaseBackup,
    className: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  SYNC_FAILED: {
    label: "Sync Failed",
    icon: AlertTriangle,
    className: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? {
    label: action,
    icon: ScrollText,
    className: "text-slate-400 bg-white/5 border-white/10",
  };
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap",
        cfg.className
      )}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

/** Pull the human-readable target (username / db identifier) out of metadata. */
function describeTarget(entry: AuditEntry): string {
  const m = entry.metadata ?? {};
  if (typeof m.username === "string") return m.username;
  if (typeof m.dbIdentifier === "string") return m.dbIdentifier;
  if (typeof m.error === "string") return m.error;
  return entry.resourceId ?? "—";
}

function accountName(entry: AuditEntry): string {
  const m = entry.metadata ?? {};
  return typeof m.accountName === "string" ? m.accountName : entry.resourceId ?? "—";
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "20" });
        if (search) params.set("search", search);
        if (action !== "all") params.set("action", action);

        const res = await fetch(`/api/audit-log?${params}`);
        const json = await res.json();
        if (json.success) {
          setEntries(json.data);
          setMeta(json.meta);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, search, action]
  );

  useEffect(() => {
    load();
    // Keep the trail fresh as background syncs record new activity.
    const interval = setInterval(() => load(true), 20_000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, action]);

  const stats = {
    total: meta?.total ?? 0,
    added: entries.filter((e) => e.action === "IAM_USER_ADDED" || e.action === "DB_ADDED").length,
    removed: entries.filter((e) => e.action === "IAM_USER_REMOVED" || e.action === "DB_REMOVED").length,
    automatic: entries.filter((e) => !e.userId).length,
  };

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-400" />
            Audit Trail
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Changes detected during AWS syncs &mdash; who, what, and when
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: stats.total, icon: ScrollText, color: "text-blue-400" },
          { label: "Resources Added", value: stats.added, icon: UserPlus, color: "text-emerald-400" },
          { label: "Resources Removed", value: stats.removed, icon: UserMinus, color: "text-red-400" },
          { label: "Automatic (cron)", value: stats.automatic, icon: Cpu, color: "text-slate-300" },
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search action, account, resource…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-52">
                <Filter className="w-3.5 h-3.5 mr-2 text-slate-500" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="IAM_USER_ADDED">IAM User Added</SelectItem>
                <SelectItem value="IAM_USER_REMOVED">IAM User Removed</SelectItem>
                <SelectItem value="DB_ADDED">Database Added</SelectItem>
                <SelectItem value="DB_REMOVED">Database Removed</SelectItem>
                <SelectItem value="SYNC_FAILED">Sync Failed</SelectItem>
              </SelectContent>
            </Select>
            {(search || action !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setAction("all"); }}
                className="text-slate-500 hover:text-white"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Activity Log</span>
            {meta && <span className="text-slate-500 font-normal">{meta.total} records</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>AWS Account</TableHead>
                <TableHead>Triggered By</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : entries.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-16">
                        No activity recorded yet. Changes will appear here after the next sync.
                      </TableCell>
                    </TableRow>
                  )
                : entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell><ActionBadge action={entry.action} /></TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-200">{describeTarget(entry)}</span>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">{accountName(entry)}</TableCell>
                      <TableCell>
                        <span className="text-xs flex items-center gap-1.5 text-slate-300">
                          {entry.userId ? (
                            <User className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Cpu className="w-3 h-3 text-slate-500" />
                          )}
                          {entry.actorName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs text-slate-400 flex items-center gap-1"
                          title={formatDateTime(entry.createdAt)}
                        >
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </TableCell>
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
