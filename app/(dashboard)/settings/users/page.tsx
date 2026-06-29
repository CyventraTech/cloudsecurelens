"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Trash2, Loader2, Eye, EyeOff, ShieldCheck,
  Mail, RefreshCw, KeyRound, UserCog, ShieldAlert, ShieldX,
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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn, formatRelativeTime } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "ADMIN" | "ANALYST" | "VIEWER";

interface AppUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const userSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

type UserFormData = z.infer<typeof userSchema>;

// ─── Role metadata ──────────────────────────────────────────────────────────

const roleMeta: Record<Role, { label: string; icon: React.ReactNode; variant: "critical" | "info" | "default"; desc: string }> = {
  ADMIN:   { label: "Admin",   icon: <ShieldAlert className="w-3 h-3" />, variant: "critical", desc: "Full access — manage users, accounts, and databases" },
  ANALYST: { label: "Analyst", icon: <ShieldCheck className="w-3 h-3" />, variant: "info",     desc: "Run audits and view all security findings" },
  VIEWER:  { label: "Viewer",  icon: <ShieldX className="w-3 h-3" />,     variant: "default",  desc: "Read-only access to dashboards and reports" },
};

function RoleBadge({ role }: { role: Role }) {
  const m = roleMeta[role];
  return (
    <Badge variant={m.variant} className="gap-1">
      {m.icon} {m.label}
    </Badge>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function FormField({
  label, error, required, children,
}: {
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

// ─── Add User Form ────────────────────────────────────────────────────────────

function AddUserForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "VIEWER" },
  });

  async function onSubmit(data: UserFormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("User created", { description: `${data.name} (${data.email})` });
        reset();
        onSuccess();
      } else {
        toast.error("Failed to create user", { description: json.error });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Full Name" error={errors.name?.message} required>
          <Input {...register("name")} placeholder="Jane Doe" />
        </FormField>
        <FormField label="Email Address" error={errors.email?.message} required>
          <Input {...register("email")} type="email" placeholder="jane@company.com" />
        </FormField>
      </div>

      <FormField label="Temporary Password" error={errors.password?.message} required>
        <div className="relative">
          <Input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
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
          Share this securely. The user can change it after first sign-in.
        </p>
      </FormField>

      <FormField label="Role" required>
        <Select defaultValue="VIEWER" onValueChange={(v) => setValue("role", v as Role)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin — full access</SelectItem>
            <SelectItem value="ANALYST">Analyst — run audits</SelectItem>
            <SelectItem value="VIEWER">Viewer — read-only</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create User"}
        </Button>
      </div>
    </form>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user, isSelf, onChangeRole, onResetPassword, onDelete, busy,
}: {
  user: AppUser;
  isSelf: boolean;
  onChangeRole: (id: string, role: Role) => void;
  onResetPassword: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  busy: boolean;
}) {
  const initials = (user.name ?? user.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card className="glass-card-hover">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-blue-300">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white truncate">
                {user.name ?? "Unnamed user"}
              </h3>
              {isSelf && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-medium">
                  You
                </span>
              )}
            </div>
            <p className="flex items-center gap-1 text-xs text-slate-500 truncate">
              <Mail className="w-3 h-3 shrink-0" /> {user.email}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-slate-500 hidden lg:block">
            Joined {formatRelativeTime(user.createdAt)}
          </span>
          <RoleBadge role={user.role} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={user.role}
            onValueChange={(v) => onChangeRole(user.id, v as Role)}
            disabled={busy}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <UserCog className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="ANALYST">Analyst</SelectItem>
              <SelectItem value="VIEWER">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => onResetPassword(user)} disabled={busy} title="Reset password">
            <KeyRound className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(user)}
            disabled={busy || isSelf}
            title={isSelf ? "You cannot delete yourself" : "Delete user"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) setUsers(json.data);
      else toast.error(json.error ?? "Failed to load users");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleChangeRole(id: string, role: Role) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Role updated");
        load();
      } else {
        toast.error("Failed to update role", { description: json.error });
        load();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(user: AppUser) {
    const password = window.prompt(`Enter a new password for ${user.email} (min 8 characters):`);
    if (password === null) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) toast.success("Password reset", { description: `New password set for ${user.email}` });
      else toast.error("Failed to reset password", { description: json.error });
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(user: AppUser) {
    if (!confirm(`Delete ${user.name ?? user.email}? This cannot be undone.`)) return;
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("User deleted");
        load();
      } else {
        toast.error("Failed to delete user", { description: json.error });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  // Non-admins should not see this page's controls.
  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-slide-in">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-lg font-bold text-white">Admins only</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          User management is restricted to administrators. Contact an admin if you need access.
        </p>
      </div>
    );
  }

  const roleCounts = users.reduce(
    (acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc; },
    {} as Record<Role, number>
  );

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            User Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create accounts and assign roles for Cloud SecureLens access
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add User
          </Button>
        </div>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3">
        {(["ADMIN", "ANALYST", "VIEWER"] as Role[]).map((r) => (
          <Card key={r} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                r === "ADMIN" ? "bg-red-500/10 text-red-400"
                  : r === "ANALYST" ? "bg-blue-500/10 text-blue-400"
                  : "bg-slate-500/10 text-slate-300"
              )}>
                {roleMeta[r].icon}
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-none">{roleCounts[r] ?? 0}</p>
                <p className="text-[11px] text-slate-500 mt-1">{roleMeta[r].label}s</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddUserForm
              onSuccess={() => { setShowForm(false); load(); }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Role legend */}
      <Card className="border-blue-500/15 bg-blue-500/5">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["ADMIN", "ANALYST", "VIEWER"] as Role[]).map((r) => (
            <div key={r} className="flex items-start gap-2.5">
              <div className="mt-0.5"><RoleBadge role={r} /></div>
              <p className="text-[11px] text-slate-400">{roleMeta[r].desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-10 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No users yet. Add your first team member.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Separator />
          <div className="space-y-3">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUser?.id}
                onChangeRole={handleChangeRole}
                onResetPassword={handleResetPassword}
                onDelete={handleDelete}
                busy={busyId === u.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
