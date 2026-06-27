"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LogIn, Search, Filter, RefreshCw, Shield,
  XCircle, CheckCircle2, AlertTriangle, Globe, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime, formatRelativeTime, cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types";

interface LoginEvent {
  id: string;
  eventType: string;
  eventTime: string;
  username: string;
  sourceIp: string | null;
  region: string | null;
  mfaUsed: boolean;
  loginResult: string;
  errorCode: string | null;
  awsAccountId: string | null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONSOLE_LOGIN:    "Console Login",
  CONSOLE_LOGOUT:   "Console Logout",
  ROOT_LOGIN:       "Root Login",
  IAM_LOGIN:        "IAM Login",
  FEDERATED_LOGIN:  "Federated Login",
  FAILED_LOGIN:     "Failed Login",
  ASSUME_ROLE:      "Assume Role",
};

function ResultBadge({ result }: { result: string }) {
  if (result === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
        <CheckCircle2 className="w-3 h-3" /> Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
      <XCircle className="w-3 h-3" /> Failed
    </span>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const isRoot = type === "ROOT_LOGIN";
  const isFailed = type === "FAILED_LOGIN";
  return (
    <span className={cn(
      "inline-block text-[10px] font-semibold px-2 py-0.5 rounded border",
      isRoot  ? "text-red-400 bg-red-500/10 border-red-500/20" :
      isFailed ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
                 "text-blue-400 bg-blue-500/10 border-blue-500/20"
    )}>
      {EVENT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export default function LoginAuditPage() {
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("all");
  const [loginResult, setLoginResult] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (eventType !== "all") params.set("eventType", eventType);
      if (loginResult !== "all") params.set("loginResult", loginResult);

      const res = await fetch(`/api/login-audit?${params}`);
      const json = await res.json();
      if (json.success) {
        setEvents(json.data);
        setMeta(json.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, eventType, loginResult]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, eventType, loginResult]);

  const stats = {
    total: meta?.total ?? 0,
    failed: events.filter((e) => e.loginResult === "FAILURE").length,
    rootLogins: events.filter((e) => e.eventType === "ROOT_LOGIN").length,
    mfaUsed: events.filter((e) => e.mfaUsed).length,
  };

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LogIn className="w-5 h-5 text-blue-400" />
            Login Audit
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">AWS CloudTrail console login events</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: meta?.total ?? 0, icon: LogIn, color: "text-blue-400" },
          { label: "Failed Logins", value: stats.failed, icon: XCircle, color: "text-red-400" },
          { label: "Root Logins", value: stats.rootLogins, icon: AlertTriangle, color: "text-orange-400" },
          { label: "MFA Used", value: stats.mfaUsed, icon: Shield, color: "text-emerald-400" },
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
                placeholder="Search username, IP, region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-44">
                <Filter className="w-3.5 h-3.5 mr-2 text-slate-500" />
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Event Types</SelectItem>
                <SelectItem value="CONSOLE_LOGIN">Console Login</SelectItem>
                <SelectItem value="CONSOLE_LOGOUT">Console Logout</SelectItem>
                <SelectItem value="ROOT_LOGIN">Root Login</SelectItem>
                <SelectItem value="IAM_LOGIN">IAM Login</SelectItem>
                <SelectItem value="FAILED_LOGIN">Failed Login</SelectItem>
                <SelectItem value="FEDERATED_LOGIN">Federated Login</SelectItem>
              </SelectContent>
            </Select>
            <Select value={loginResult} onValueChange={setLoginResult}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILURE">Failure</SelectItem>
              </SelectContent>
            </Select>
            {(search || eventType !== "all" || loginResult !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setEventType("all"); setLoginResult("all"); }}
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
            <span>Login Events</span>
            {meta && <span className="text-slate-500 font-normal">{meta.total} records</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Source IP</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : events.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-16">
                        No login events found
                      </TableCell>
                    </TableRow>
                  )
                : events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell><EventTypeBadge type={ev.eventType} /></TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-200">{ev.username}</span>
                        {ev.eventType === "ROOT_LOGIN" && (
                          <Badge variant="critical" className="ml-2">ROOT</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-600" />
                          {ev.sourceIp ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">{ev.region ?? "—"}</TableCell>
                      <TableCell>
                        {ev.mfaUsed ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> No
                          </span>
                        )}
                      </TableCell>
                      <TableCell><ResultBadge result={ev.loginResult} /></TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400 flex items-center gap-1" title={formatDateTime(ev.eventTime)}>
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(ev.eventTime)}
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
