"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database, RefreshCw, Search, Lock, Unlock,
  Globe, Shield, HardDrive, CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types";

interface DBRecord {
  id: string;
  dbIdentifier: string;
  dbName: string | null;
  engine: string;
  engineVersion: string | null;
  status: string;
  instanceClass: string | null;
  multiAz: boolean;
  storageEncrypted: boolean;
  publiclyAccessible: boolean;
  iamDatabaseAuthEnabled: boolean;
  deletionProtection: boolean;
  backupRetentionPeriod: number;
  allocatedStorage: number | null;
  port: number | null;
  availabilityZone: string | null;
  riskLevel: string;
}

function CheckCell({ value, invert = false }: { value: boolean; invert?: boolean }) {
  const good = invert ? !value : value;
  return good ? (
    <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3.5 h-3.5" /> No</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "available" ? "success" : status === "stopped" ? "critical" : "warning";
  return <Badge variant={color as "success" | "critical" | "warning"}>{status}</Badge>;
}

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, "critical" | "high" | "medium" | "low"> = {
    CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
  };
  return <Badge variant={map[level] ?? "outline"}>{level}</Badge>;
}

export default function DatabaseAuditPage() {
  const [databases, setDatabases] = useState<DBRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [publicFilter, setPublicFilter] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (riskFilter !== "all") params.set("riskLevel", riskFilter);
      if (publicFilter !== "all") params.set("publiclyAccessible", publicFilter);

      const res = await fetch(`/api/database-audit?${params}`);
      const json = await res.json();
      if (json.success) { setDatabases(json.data); setMeta(json.meta); }
    } finally { setLoading(false); }
  }, [page, search, riskFilter, publicFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, riskFilter, publicFilter]);

  // Quick risk summary
  const criticalCount = databases.filter((d) => d.riskLevel === "CRITICAL").length;
  const publicCount = databases.filter((d) => d.publiclyAccessible).length;
  const unencryptedCount = databases.filter((d) => !d.storageEncrypted).length;

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" /> Database Audit
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Aurora PostgreSQL security configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Databases", value: meta?.total ?? 0, icon: Database, color: "text-blue-400" },
          { label: "Critical Risk",   value: criticalCount,   icon: AlertTriangle, color: "text-red-400" },
          { label: "Public Access",   value: publicCount,     icon: Globe,   color: "text-orange-400" },
          { label: "Unencrypted",     value: unencryptedCount, icon: Unlock, color: "text-yellow-400" },
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
              <Input placeholder="Search database identifier…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Risk level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={publicFilter} onValueChange={setPublicFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Public access" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Databases</SelectItem>
                <SelectItem value="true">Public Only</SelectItem>
                <SelectItem value="false">Private Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex justify-between">
            <span>Aurora Databases</span>
            {meta && <span className="text-slate-500 font-normal">{meta.total} databases</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identifier</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Encrypted</TableHead>
                <TableHead>Public</TableHead>
                <TableHead>IAM Auth</TableHead>
                <TableHead>Backups</TableHead>
                <TableHead>Multi-AZ</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : databases.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-slate-500 py-16">
                        No databases found
                      </TableCell>
                    </TableRow>
                  )
                : databases.map((db) => (
                    <TableRow key={db.id} className={cn(db.riskLevel === "CRITICAL" && "bg-red-500/5")}>
                      <TableCell>
                        <p className="font-mono text-xs text-white">{db.dbIdentifier}</p>
                        {db.dbName && <p className="text-[10px] text-slate-500">{db.dbName}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-300">{db.engine}</p>
                        <p className="text-[10px] text-slate-500">{db.engineVersion}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={db.status} /></TableCell>
                      <TableCell>
                        {db.storageEncrypted
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><Lock className="w-3 h-3" /> Yes</span>
                          : <span className="flex items-center gap-1 text-xs text-red-400"><Unlock className="w-3 h-3" /> No</span>}
                      </TableCell>
                      <TableCell>
                        {db.publiclyAccessible
                          ? <span className="flex items-center gap-1 text-xs text-red-400"><Globe className="w-3 h-3" /> Yes</span>
                          : <span className="text-xs text-emerald-400">Private</span>}
                      </TableCell>
                      <TableCell><CheckCell value={db.iamDatabaseAuthEnabled} /></TableCell>
                      <TableCell>
                        <span className={cn("text-xs", db.backupRetentionPeriod >= 7 ? "text-emerald-400" : "text-orange-400")}>
                          {db.backupRetentionPeriod}d
                        </span>
                      </TableCell>
                      <TableCell><CheckCell value={db.multiAz} /></TableCell>
                      <TableCell><RiskBadge level={db.riskLevel} /></TableCell>
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
