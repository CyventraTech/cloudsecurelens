"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Shield, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email.toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("root", { message: "Invalid email or password" });
        toast.error("Authentication failed", {
          description: "Check your credentials and try again.",
        });
        return;
      }

      toast.success("Signed in successfully");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050b14] px-4 py-12">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4 mx-auto">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Cloud SecureLens
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AWS Security Dashboard
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign in</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Access your security dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Root error */}
            {errors.root && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.root.message}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@company.com"
                  {...register("email")}
                  className={cn(
                    "w-full h-10 pl-10 pr-4 rounded-lg border bg-[#0d1829] text-sm text-slate-200 placeholder:text-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors",
                    errors.email
                      ? "border-red-500/50 focus:ring-red-500/30"
                      : "border-blue-500/20 focus:border-blue-500/40"
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={cn(
                    "w-full h-10 pl-10 pr-10 rounded-lg border bg-[#0d1829] text-sm text-slate-200 placeholder:text-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors",
                    errors.password
                      ? "border-red-500/50 focus:ring-red-500/30"
                      : "border-blue-500/20 focus:border-blue-500/40"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-10 rounded-lg text-sm font-semibold transition-all duration-200",
                "bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0d1829]",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
                "flex items-center justify-center gap-2"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 pt-5 border-t border-blue-500/10">
            <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider font-medium">
              Demo credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <DemoCredentialButton
                label="Admin"
                email="admin@cloudsecurelens.io"
                password="Admin@SecureLens2024"
                onFill={(email, password) => {
                  void signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                  }).then((r) => {
                    if (!r?.error) {
                      toast.success("Signed in as Admin");
                      router.push(callbackUrl);
                      router.refresh();
                    }
                  });
                }}
              />
              <DemoCredentialButton
                label="Analyst"
                email="analyst@cloudsecurelens.io"
                password="Analyst@SecureLens2024"
                onFill={(email, password) => {
                  void signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                  }).then((r) => {
                    if (!r?.error) {
                      toast.success("Signed in as Analyst");
                      router.push(callbackUrl);
                      router.refresh();
                    }
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Cloud SecureLens · AWS Security Dashboard · v1.0
        </p>
      </div>
    </div>
  );
}

// ─── Demo credential quick-fill button ───────────────────────────────────────
function DemoCredentialButton({
  label,
  email,
  password,
  onFill,
}: {
  label: string;
  email: string;
  password: string;
  onFill: (email: string, password: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onFill(email, password)}
      className="flex flex-col items-start px-3 py-2 rounded-lg border border-blue-500/15 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/25 transition-colors text-left"
    >
      <span className="text-xs font-semibold text-blue-300">{label}</span>
      <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">{email}</span>
    </button>
  );
}
