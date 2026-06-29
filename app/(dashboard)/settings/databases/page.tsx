"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HardDrive, Plus, RefreshCw, Trash2, CheckCircle2,
  XCircle, Clock, Loader2, Eye, EyeOff, Lock, AlertTriangle
} from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatRelativeTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonitoredDB {
  id: string;
  awsAccountId: string;
  dbIdentifier: string;
  displayName: string;
  description?: string;
  engine: string;
  port: number;
  databaseName: string;
  region: string;
  authType: string;
  sslEnabled: boolean;
  enableActivityLogs: boolean;
  enableAuditLogs: boolean;
  status: string;
  lastCheckedAt?: string;
  lastError?: string;
  isActive: boolean;
  createdAt: string;
  hasCredentials: boolean;
  awsAccount: { accountName: string; environment: string };
}

interface AwsAccountOption {
  accountId: string;
  accountName: string;
  environment: string;
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const dbSchema = z.object({
  awsAccountId:   z.string().min(1, "Select an AWS account"),
  dbIdentifier:   z.string().min(1).max(100),
  displayName:    z.string().min(1).max(100),
  description:    z.string().max(500).optional(),
  engine:         z.enum(["AURORA_POSTGRESQL","AURORA_MYSQL","RDS_POSTGRESQL","RDS_MYSQL","RDS_SQLSERVER","RDS_ORACLE"]),
  host:           z.string().min(1, "Database endpoint is required"),
  port:           z.coerce.number().int().min(1).max(65535),
  databaseName:   z.string().min(1, "Database name is required"),
  region:         z.string().min(1),
  authType:       z.enum(["PASSWORD","IAM","SECRET"]),
  dbUsername:     z.string().optional(),
  dbPassword:     z.string().optional(),
  sslEnabled:     z.boolean(),
  enableActivityLogs:  z.boolean(),
  enableAuditLogs:     z.boolean(),
  enableSlowQueryLogs: z.boolean(),
  slowQueryThresholdMs: z.coerce.number().int().min(100),
});

type DbFormData = z.infer<typeof dbSchema>;

// ─── Engine label map ─────────────────────────────────────────────────────────

const ENGINE_LABELS: Record<string, string> = {
  AURORA_POSTGRESQL: "Aurora PostgreSQL",
  AURORA_MYSQL:      "Aurora MySQL",
  RDS_POSTGRESQL:    "RDS PostgreSQL",
  RDS_MYSQL:         "RDS MySQL",
  RDS_SQLSERVER:     "RDS SQL Server",
  RDS_ORACLE:        "RDS Oracle",
};

const ENGINE_DEFAULT_PORTS: Record<string, number> = {
  AURORA_POSTGRESQL: 5432,
  RDS_POSTGRESQL:    5432,
  AURORA_MYSQL:      3306,
  RDS_MYSQL:         3306,
  RDS_SQLSERVER:     1433,
  RDS_ORACLE:        1521,
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "success"|"critical"|"warning"|"info" }> = {
    CONNECTED: { variant: "success"  },
    ERROR:     { variant: "critical" },
    PENDING:   { variant: "warning"  },
    DISABLED:  { variant: "info"     },
  };
  return <Badge variant={map[status]?.variant ?? "outline"}>{status}</Badge>;
}

// ─── Add DB Form ──────────────────────────────────────────────────────────────

function AddDatabaseForm({
  accounts,
  onSuccess,
  onCancel,
}: {
  accounts: AwsAccountOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resolver = zodResolver(dbSchema) as unknown as Resolver<DbFormData>;

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<DbFormData>({
    resolver,
    defaultValues: {
      engine: "AURORA_POSTGRESQL",
      port: 5432,
      region: "us-east-1",
      authType: "PASSWORD",
      sslEnabled: true,
      enableActivityLogs: true,
      enableAuditLogs: true,
      enableSlowQueryLogs: true,
      slowQueryThresholdMs: 1000,
    },
  });

  const authType = watch("authType");
  const engine   = watch("engine");

  // Auto-update port when engine changes
  useEffect(() => {
    if (engine && ENGINE_DEFAULT_PORTS[engine]) {
      setValue("port", ENGINE_DEFAULT_PORTS[engine]);
    }
  }, [engine, setValue]);

  async function onSubmit(data: DbFormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Database registered", {
          description: `${data.displayName} added for monitoring`,
        });
        reset();
        onSuccess();
      } else {
        toast.error("Failed to register database", { description: json.error });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="connection">
        <TabsList className="mb-5">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Connection tab */}
        <TabsContent value="connection" className="space-y-4">
          <FormField label="AWS Account" error={errors.awsAccountId?.message} required>
            <Select onValueChange={(v) => setValue("awsAccountId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.accountId} value={a.accountId}>
                    {a.accountName} ({a.accountId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Display Name" error={errors.displayName?.message} required>
              <Input {...register("displayName")} placeholder="Production Aurora" />
            </FormField>
            <FormField label="DB Identifier" error={errors.dbIdentifier?.message} required>
              <Input {...register("dbIdentifier")} placeholder="prod-aurora-cluster" className="font-mono" />
            </FormField>
          </div>

          <FormField label="Description" error={errors.description?.message}>
            <Input {...register("description")} placeholder="Main production database" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Engine" error={errors.engine?.message} required>
              <Select defaultValue="AURORA_POSTGRESQL" onValueChange={(v) => setValue("engine", v as DbFormData["engine"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENGINE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Region" error={errors.region?.message} required>
              <Input {...register("region")} placeholder="us-east-1" />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <FormField label="Endpoint / Host" error={errors.host?.message} required>
                <Input {...register("host")} placeholder="cluster.cluster-xxxx.us-east-1.rds.amazonaws.com" className="font-mono text-xs" />
              </FormField>
            </div>
            <FormField label="Port" error={errors.port?.message} required>
              <Input {...register("port")} type="number" />
            </FormField>
          </div>

          <FormField label="Database Name" error={errors.databaseName?.message} required>
            <Input {...register("databaseName")} placeholder="myapp_production" />
          </FormField>
        </TabsContent>

        {/* Credentials tab */}
        <TabsContent value="credentials" className="space-y-4">
          <div className="flex gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-300">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            All credentials are encrypted with AES-256-GCM before storage. Never stored in plaintext.
          </div>

          <FormField label="Authentication Type" error={errors.authType?.message} required>
            <Select defaultValue="PASSWORD" onValueChange={(v) => setValue("authType", v as DbFormData["authType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PASSWORD">Username & Password</SelectItem>
                <SelectItem value="IAM">RDS IAM Authentication</SelectItem>
                <SelectItem value="SECRET">AWS Secrets Manager</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {authType === "PASSWORD" && (
            <>
              <FormField label="Database Username" error={errors.dbUsername?.message}>
                <Input {...register("dbUsername")} placeholder="app_readonly" />
              </FormField>
              <FormField label="Database Password" error={errors.dbPassword?.message}>
                <div className="relative">
                  <Input
                    {...register("dbPassword")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Use a read-only database user — never the master password
                </p>
              </FormField>
            </>
          )}

          {authType === "IAM" && (
            <div className="px-3 py-2.5 rounded-lg bg-blue-500/8 border border-blue-500/20 text-xs text-blue-300">
              RDS IAM authentication uses the AWS credentials from the onboarded account.
              Ensure the IAM user/role has <code>rds-db:connect</code> permission.
            </div>
          )}

          {authType === "SECRET" && (
            <FormField label="Secret ARN" error={undefined}>
              <Input {...register("dbUsername")} placeholder="arn:aws:secretsmanager:us-east-1:123:secret:name" className="font-mono text-xs" />
            </FormField>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="ssl"
              {...register("sslEnabled")}
              className="w-4 h-4 rounded border-blue-500/30 bg-[#0d1829] text-blue-500"
            />
            <Label htmlFor="ssl">Require SSL/TLS connection</Label>
          </div>
        </TabsContent>

        {/* Monitoring tab */}
        <TabsContent value="monitoring" className="space-y-4">
          {[
            { name: "enableActivityLogs"  as const, label: "Activity Logs",   desc: "Track SELECT/INSERT/UPDATE/DELETE operations" },
            { name: "enableAuditLogs"     as const, label: "Audit Logs",      desc: "Track DDL, privilege changes, and logins" },
            { name: "enableSlowQueryLogs" as const, label: "Slow Query Logs", desc: "Alert on queries exceeding the threshold" },
          ].map((opt) => (
            <div key={opt.name} className="flex items-start gap-3 p-3 rounded-lg border border-blue-500/10 bg-[#050b14]/40">
              <input
                type="checkbox"
                id={opt.name}
                {...register(opt.name)}
                className="w-4 h-4 rounded border-blue-500/30 bg-[#0d1829] text-blue-500 mt-0.5"
              />
              <div>
                <Label htmlFor={opt.name} className="text-slate-200 text-xs font-medium">{opt.label}</Label>
                <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
            </div>
          ))}

          <FormField label="Slow Query Threshold (ms)" error={errors.slowQueryThresholdMs?.message}>
            <Input {...register("slowQueryThresholdMs")} type="number" placeholder="1000" />
          </FormField>
        </TabsContent>
      </Tabs>

      <Separator className="my-5" />

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registering…</> : "Register Database"}
        </Button>
      </div>
    </form>
  );
}

// ─── DB Card ──────────────────────────────────────────────────────────────────

function DatabaseCard({ db, onDelete }: { db: MonitoredDB; onDelete: (id: string) => void }) {
  const envColors: Record<string, string> = {
    PRODUCTION:  "text-red-400",
    STAGING:     "text-orange-400",
    DEVELOPMENT: "text-blue-400",
    SANDBOX:     "text-slate-400",
  };

  return (
    <Card className={cn("glass-card-hover", !db.isActive && "opacity-60")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600/15 border border-purple-500/20 flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{db.displayName}</h3>
              <p className="text-[10px] font-mono text-slate-500">{db.dbIdentifier}</p>
            </div>
          </div>
          <StatusBadge status={db.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
          <div>
            <span className="text-slate-600">Account: </span>
            <span className={cn("font-medium", envColors[db.awsAccount.environment] ?? "")}>
              {db.awsAccount.accountName}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Engine: </span>
            <span>{ENGINE_LABELS[db.engine] ?? db.engine}</span>
          </div>
          <div>
            <span className="text-slate-600">Database: </span>
            <span className="font-mono">{db.databaseName}</span>
          </div>
          <div>
            <span className="text-slate-600">Port: </span>
            <span className="font-mono">{db.port}</span>
          </div>
          <div>
            <span className="text-slate-600">Auth: </span>
            <span>{db.authType}</span>
          </div>
          <div>
            <span className="text-slate-600">SSL: </span>
            <span className={db.sslEnabled ? "text-emerald-400" : "text-red-400"}>
              {db.sslEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Monitoring flags */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {db.enableActivityLogs && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15">
              Activity
            </span>
          )}
          {db.enableAuditLogs && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/15">
              Audit
            </span>
          )}
          {db.hasCredentials && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Creds Stored
            </span>
          )}
        </div>

        {/* Error */}
        {db.lastError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded bg-red-500/8 border border-red-500/20 text-xs text-red-400 mb-3">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{db.lastError}</span>
          </div>
        )}

        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(db.id)}
          className="w-full"
          disabled={!db.isActive}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Disable Monitoring
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function FormField({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<MonitoredDB[]>([]);
  const [accounts, setAccounts] = useState<AwsAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dbRes, acctRes] = await Promise.all([
        fetch("/api/databases"),
        fetch("/api/accounts"),
      ]);
      const [dbJson, acctJson] = await Promise.all([dbRes.json(), acctRes.json()]);
      if (dbJson.success)   setDatabases(dbJson.data);
      if (acctJson.success) setAccounts(acctJson.data.map((a: { accountId: string; accountName: string; environment: string }) => ({
        accountId:   a.accountId,
        accountName: a.accountName,
        environment: a.environment,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Disable monitoring for this database?")) return;
    try {
      const res = await fetch(`/api/databases/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("Database monitoring disabled"); load(); }
      else toast.error(json.error);
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-purple-400" />
            Monitored Databases
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Register RDS and Aurora databases — credentials stored encrypted
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)} disabled={accounts.length === 0}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Database
          </Button>
        </div>
      </div>

      {/* No accounts warning */}
      {!loading && accounts.length === 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">No AWS accounts onboarded</p>
              <p className="text-xs text-slate-400">
                <a href="/settings/accounts" className="text-blue-400 hover:underline">Add an AWS account first</a>
                {" "}before registering databases.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      {showForm && accounts.length > 0 && (
        <Card className="border-purple-500/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Register Database for Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddDatabaseForm
              accounts={accounts}
              onSuccess={() => { setShowForm(false); load(); }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Databases grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : databases.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-slate-500">
            <HardDrive className="w-12 h-12 text-purple-500/20" />
            <p className="font-medium text-slate-300">No databases registered yet</p>
            <p className="text-sm text-center max-w-sm">
              Register your Aurora and RDS databases to start collecting query activity and audit logs.
            </p>
            {accounts.length > 0 && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Register First Database
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map((db) => (
            <DatabaseCard key={db.id} db={db} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
