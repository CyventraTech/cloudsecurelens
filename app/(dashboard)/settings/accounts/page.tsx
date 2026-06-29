"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cloud, Plus, RefreshCw, Trash2, Edit2, CheckCircle2,
  XCircle, AlertTriangle, Clock, Loader2, Eye, EyeOff,
  ExternalLink, Copy, Shield
} from "lucide-react";
import { useForm } from "react-hook-form";
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
import { cn, formatRelativeTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AwsAccount {
  id: string;
  accountId: string;
  accountName: string;
  description?: string;
  environment: string;
  region: string;
  roleArn?: string;
  authType: "ROLE" | "KEYS";
  hasDirectCredentials: boolean;
  status: string;
  lastSyncAt?: string;
  lastSyncError?: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    loginAudits: number;
    iamAudits: number;
    databaseAudits: number;
    monitoredDatabases: number;
  };
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const accountSchema = z.discriminatedUnion("authMethod", [
  z.object({
    authMethod:   z.literal("role"),
    accountId:    z.string().regex(/^\d{12}$/, "Must be a 12-digit AWS account ID"),
    accountName:  z.string().min(1, "Name is required").max(100),
    description:  z.string().max(500).optional(),
    environment:  z.enum(["PRODUCTION","STAGING","DEVELOPMENT","SANDBOX"]),
    region:       z.string().min(1),
    roleArn:      z.string().regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Invalid role ARN"),
    externalId:   z.string().max(128).optional(),
  }),
  z.object({
    authMethod:      z.literal("keys"),
    accountId:       z.string().regex(/^\d{12}$/, "Must be a 12-digit AWS account ID"),
    accountName:     z.string().min(1, "Name is required").max(100),
    description:     z.string().max(500).optional(),
    environment:     z.enum(["PRODUCTION","STAGING","DEVELOPMENT","SANDBOX"]),
    region:          z.string().min(1),
    accessKeyId:     z.string().regex(/^AKIA[A-Z0-9]{16}$/, "Invalid access key format"),
    secretAccessKey: z.string().min(1, "Secret key is required"),
  }),
]);

type AccountFormData = z.infer<typeof accountSchema>;

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "success"|"critical"|"warning"|"info"; icon: React.ReactNode }> = {
    ACTIVE:   { variant: "success",  icon: <CheckCircle2 className="w-3 h-3" /> },
    ERROR:    { variant: "critical", icon: <XCircle className="w-3 h-3" /> },
    PENDING:  { variant: "warning",  icon: <Clock className="w-3 h-3" /> },
    DISABLED: { variant: "info",     icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <Badge variant={s.variant} className="gap-1">
      {s.icon} {status}
    </Badge>
  );
}

// ─── Add Account Modal ────────────────────────────────────────────────────────

function AddAccountForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [authMethod, setAuthMethod] = useState<"role" | "keys">("role");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { authMethod: "role", environment: "PRODUCTION", region: "us-east-1" } as AccountFormData,
  });

  // Sync authMethod field
  useEffect(() => {
    setValue("authMethod", authMethod);
  }, [authMethod, setValue]);

  async function onSubmit(data: AccountFormData) {
    setLoading(true);
    try {
      const payload = {
        accountId:    data.accountId,
        accountName:  data.accountName,
        description:  data.description,
        environment:  data.environment,
        region:       data.region,
        ...(data.authMethod === "role"
          ? { roleArn: data.roleArn, externalId: data.externalId }
          : { accessKeyId: data.accessKeyId, secretAccessKey: data.secretAccessKey }),
      };

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("AWS account onboarded", {
          description: `${data.accountName} (${data.accountId}) added successfully`,
        });
        reset();
        onSuccess();
      } else {
        toast.error("Failed to onboard account", { description: json.error });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Auth method toggle */}
      <div className="flex gap-2 p-1 bg-[#050b14] rounded-lg border border-blue-500/10">
        {(["role", "keys"] as const).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => setAuthMethod(method)}
            className={cn(
              "flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all",
              authMethod === method
                ? "bg-blue-600/25 text-blue-300 border border-blue-500/30"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {method === "role" ? "🔐 IAM Role (Recommended)" : "🔑 Access Keys"}
          </button>
        ))}
      </div>

      {/* IAM Role security notice */}
      {authMethod === "role" && (
        <div className="flex gap-2.5 px-3 py-2.5 rounded-lg bg-blue-500/8 border border-blue-500/20 text-xs text-blue-300">
          <Shield className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Cross-Account IAM Role (Best Practice)</p>
            <p className="text-blue-400/80">
              Create an IAM role in the target account, attach the required read-only policies,
              and add Cloud SecureLens as a trusted principal. No long-term keys stored.
            </p>
          </div>
        </div>
      )}

      {/* Core fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="AWS Account ID" error={errors.accountId?.message} required>
          <Input {...register("accountId")} placeholder="123456789012" className="font-mono" />
        </FormField>
        <FormField label="Account Name" error={errors.accountName?.message} required>
          <Input {...register("accountName")} placeholder="Production" />
        </FormField>
      </div>

      <FormField label="Description" error={errors.description?.message}>
        <Input {...register("description")} placeholder="Main production AWS account" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Environment" error={undefined} required>
          <Select defaultValue="PRODUCTION" onValueChange={(v) => setValue("environment", v as "PRODUCTION"|"STAGING"|"DEVELOPMENT"|"SANDBOX")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PRODUCTION">Production</SelectItem>
              <SelectItem value="STAGING">Staging</SelectItem>
              <SelectItem value="DEVELOPMENT">Development</SelectItem>
              <SelectItem value="SANDBOX">Sandbox</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Primary Region" error={undefined} required>
          <Input {...register("region")} placeholder="us-east-1" />
        </FormField>
      </div>

      <Separator />

      {/* Auth fields */}
      {authMethod === "role" ? (
        <>
          <FormField label="Role ARN" error={(errors as { roleArn?: { message?: string } }).roleArn?.message} required>
            <Input
              {...register("roleArn" as keyof AccountFormData)}
              placeholder="arn:aws:iam::123456789012:role/CloudSecureLensRole"
              className="font-mono text-xs"
            />
          </FormField>
          <FormField label="External ID" error={undefined}>
            <Input
              {...register("externalId" as keyof AccountFormData)}
              placeholder="Optional — adds extra security to AssumeRole"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Recommended to prevent confused deputy attacks
            </p>
          </FormField>
        </>
      ) : (
        <>
          <div className="flex gap-2.5 px-3 py-2.5 rounded-lg bg-yellow-500/8 border border-yellow-500/20 text-xs text-yellow-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Credentials are encrypted with AES-256-GCM before storage.
              Use an IAM user with <strong>read-only policies</strong> and no console access.
            </div>
          </div>
          <FormField label="Access Key ID" error={(errors as { accessKeyId?: { message?: string } }).accessKeyId?.message} required>
            <Input
              {...register("accessKeyId" as keyof AccountFormData)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className="font-mono"
            />
          </FormField>
          <FormField label="Secret Access Key" error={(errors as { secretAccessKey?: { message?: string } }).secretAccessKey?.message} required>
            <div className="relative">
              <Input
                {...register("secretAccessKey" as keyof AccountFormData)}
                type={showSecret ? "text" : "password"}
                placeholder="••••••••••••••••••••••••••••••••••••••••"
                className="font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Account"}
        </Button>
      </div>
    </form>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onSync,
  onDelete,
  syncing,
}: {
  account: AwsAccount;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
  syncing: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copyId() {
    navigator.clipboard.writeText(account.accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const envColors: Record<string, string> = {
    PRODUCTION:  "text-red-400 bg-red-500/10 border-red-500/20",
    STAGING:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
    DEVELOPMENT: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    SANDBOX:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };

  return (
    <Card className={cn("glass-card-hover", !account.isActive && "opacity-60")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{account.accountName}</h3>
              <button
                onClick={copyId}
                className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
              >
                {account.accountId}
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded border", envColors[account.environment] ?? envColors.SANDBOX)}>
              {account.environment}
            </span>
            <StatusBadge status={account.status} />
          </div>
        </div>

        {/* Description */}
        {account.description && (
          <p className="text-xs text-slate-500 mb-3">{account.description}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "Login Events", value: account._count.loginAudits },
            { label: "IAM Users",    value: account._count.iamAudits },
            { label: "Databases",    value: account._count.databaseAudits },
            { label: "Monitored",    value: account._count.monitoredDatabases },
          ].map((s) => (
            <div key={s.label} className="text-center bg-[#050b14]/50 rounded-lg p-2">
              <p className="text-sm font-bold text-white">{s.value}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Auth info + region */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            {account.authType === "ROLE"
              ? <><Shield className="w-3 h-3 text-emerald-400" /> IAM Role</>
              : <><AlertTriangle className="w-3 h-3 text-yellow-400" /> Access Keys</>}
          </span>
          <span>•</span>
          <span>{account.region}</span>
          {account.lastSyncAt && (
            <>
              <span>•</span>
              <span>Synced {formatRelativeTime(account.lastSyncAt)}</span>
            </>
          )}
        </div>

        {/* Error */}
        {account.lastSyncError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-xs text-red-400 mb-3">
            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{account.lastSyncError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSync(account.id)}
            disabled={syncing || !account.isActive}
            className="flex-1"
          >
            {syncing
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Syncing…</>
              : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync Now</>}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(account.id)}
            disabled={!account.isActive}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      if (json.success) setAccounts(json.data);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Keep account cards (and their IAM/DB counts) fresh in the background.
    const interval = setInterval(() => load(true), 20_000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/accounts/${id}/sync`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const removed = (json.data.iamUsersRemoved ?? 0) + (json.data.dbInstancesRemoved ?? 0);
        toast.success("Sync complete", {
          description:
            `Synced ${json.data.iamUsersSynced} IAM users, ${json.data.dbInstancesSynced} databases` +
            (removed > 0 ? ` · removed ${removed} stale record${removed === 1 ? "" : "s"}` : ""),
        });
        load();
      } else {
        toast.error("Sync failed", { description: json.error });
        load();
      }
    } catch {
      toast.error("Network error during sync");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Disable this AWS account? Audit history will be preserved.")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Account disabled");
        load();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            AWS Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Onboard AWS accounts using IAM roles (recommended) or access keys
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Onboard AWS Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddAccountForm
              onSuccess={() => { setShowForm(false); load(); }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* IAM Role setup guide */}
      <Card className="border-blue-500/15 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-300 mb-1">
                Setting up Cross-Account IAM Role
              </p>
              <p className="text-xs text-slate-400 mb-2">
                In the target AWS account, create an IAM role with these settings:
              </p>
              <div className="space-y-1 text-xs font-mono text-slate-300">
                <p>• <span className="text-slate-500">Role name:</span> CloudSecureLensRole</p>
                <p>• <span className="text-slate-500">Trust entity:</span> Your Cloud SecureLens AWS account ID</p>
                <p>• <span className="text-slate-500">Policies:</span> SecurityAudit, AmazonRDSReadOnlyAccess, CloudTrailReadOnlyAccess</p>
              </div>
              <a
                href="https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                AWS IAM cross-account role guide
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-slate-500">
            <Cloud className="w-12 h-12 text-blue-500/20" />
            <p className="font-medium text-slate-300">No AWS accounts onboarded yet</p>
            <p className="text-sm text-center max-w-sm">
              Add your first AWS account above to start monitoring login events,
              IAM users, and database security.
            </p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onSync={handleSync}
              onDelete={handleDelete}
              syncing={syncingId === acc.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
