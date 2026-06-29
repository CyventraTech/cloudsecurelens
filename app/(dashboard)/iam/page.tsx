"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, RefreshCw, ShieldCheck, ShieldX,
  Key, UserX, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatRelativeTime, getSeverityColor, cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types";

interface IAMUser {
  id: string;
  username: string;
  arn: string | null;
  mfaEnabled: boolean;
  isRoot: boolean;
  accessKey1Active: boolean | null;
  accessKey1LastRotated: string | null;
  isActive: boolean;
  riskLevel: string;
  snapshotAt: string;
}

interface IAMSummary {
  totalUsers: number;
  mfaEnabled: number;
  mfaDisabled: number;
  inactiveUsers: number;
  rootMfaEnabled: boolean;
  accessKeysActive: number;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low", INFO: "info",
  };
  return <Badge variant={(colors[level] as "critical" | "high" | "medium" | "low" | "info") ?? "outline"}>{level}</Badge>;
}

export default function IAMPage() {
  const [users, setUsers] = useState<IAMUser[]>([]);
  const [summary, setSummary] = useState<IAMSummary | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mfaFilter, setMfaFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (mfaFilter !== "all") params.set("mfaEnabled", mfaFilter);
      if (riskFilter !== "all") params.set("riskLevel", riskFilter);

      const res = await fetch(`/api/iam?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
        setSummary(json.data.summary);
        setMeta(json.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, mfaFilter, riskFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, mfaFilter, riskFilter]);

  const mfaCoverage = summary
    ? Math.round((summary.mfaEnabled / Math.max(summary.totalUsers - 1, 1)) * 100)
    : 0;

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            IAM Security
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Identity and Access Management posture</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Users",    value: summary?.totalUsers ?? 0,    icon: Users,     color: "text-blue-400" },
          { label: "MFA Enabled",    value: summary?.mfaEnabled ?? 0,    icon: ShieldCheck, color: "text-emerald-400" },
          { label: "MFA Disabled",   value: summary?.mfaDisabled ?? 0,   icon: ShieldX,   color: "text-red-400" },
          { label: "Inactive Users", value: summary?.inactiveUsers ?? 0, icon: UserX,     color: "text-orange-400" },
          { label: "Active Keys",    value: summary?.accessKeysActive ?? 0, icon: Key,   color: "text-yellow-400" },
          { label: "Root MFA",       value: summary?.rootMfaEnabled ? "Yes" : "No",
            icon: summary?.rootMfaEnabled ? ShieldCheck : ShieldX,
            color: summary?.rootMfaEnabled ? "text-emerald-400" : "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <s.icon className={cn("w-4 h-4 mb-2", s.color)} />
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* MFA coverage bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">MFA Coverage (non-root)</span>
            <span className={cn(
              "text-sm font-bold",
              mfaCoverage >= 80 ? "text-emerald-400" : mfaCoverage >= 50 ? "text-yellow-400" : "text-red-400"
            )}>
              {mfaCoverage}%
            </span>
          </div>
          <Progress
            value={mfaCoverage}
            className="h-2.5"
            indicatorClassName={
              mfaCoverage >= 80 ? "bg-emerald-500" :
              mfaCoverage >= 50 ? "bg-yellow-500" : "bg-red-500"
            }
          />
          {!loading && summary && summary.mfaDisabled > 0 && (
            <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {summary.mfaDisabled} user{summary.mfaDisabled > 1 ? "s" : ""} without MFA — immediate action recommended
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Search username, ARN…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={mfaFilter} onValueChange={setMfaFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="MFA status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All MFA Status</SelectItem>
                <SelectItem value="true">MFA Enabled</SelectItem>
                <SelectItem value="false">MFA Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex justify-between">
            <span>IAM Users</span>
            {meta && <span className="text-slate-500 font-normal">{meta.total} users</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Access Key</TableHead>
                <TableHead>Key Age</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Last Snapshot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : users.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-16">
                        No IAM users found
                      </TableCell>
                    </TableRow>
                  )
                : users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-200">{user.username}</span>
                          {user.isRoot && <Badge variant="critical">ROOT</Badge>}
                        </div>
                        {user.arn && (
                          <p className="font-mono text-[10px] text-slate-600 truncate max-w-[220px] mt-0.5">{user.arn}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.mfaEnabled ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <XCircle className="w-3.5 h-3.5" /> Disabled
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.accessKey1Active ? (
                          <span className="flex items-center gap-1 text-xs text-yellow-400">
                            <Key className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {user.accessKey1LastRotated
                          ? formatRelativeTime(user.accessKey1LastRotated)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="warning">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell><RiskBadge level={user.riskLevel} /></TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(user.snapshotAt)}</TableCell>
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
