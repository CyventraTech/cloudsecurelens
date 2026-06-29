"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { loginSchema, type LoginInput } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

function makeChallenge() {
  return {
    a: Math.floor(Math.random() * 8) + 2,
    b: Math.floor(Math.random() * 8) + 1,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Lightweight, self-contained captcha (math challenge — no external service).
  // Start with a fixed challenge so the server and client render identical HTML,
  // then randomize after mount to avoid a hydration mismatch (Math.random()
  // would otherwise produce different numbers on the server vs. the client).
  const [challenge, setChallenge] = useState({ a: 3, b: 4 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const refreshChallenge = useCallback(() => {
    setChallenge(makeChallenge());
    setCaptchaInput("");
    setCaptchaError(null);
  }, []);

  // Randomize the captcha once on the client, after hydration.
  useEffect(() => {
    setChallenge(makeChallenge());
  }, []);

  const resolver = zodResolver(loginSchema) as unknown as Resolver<LoginInput>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({
    resolver,
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    // Verify captcha before attempting authentication.
    if (Number.parseInt(captchaInput, 10) !== challenge.a + challenge.b) {
      setCaptchaError("Incorrect answer. Please try again.");
      refreshChallenge();
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email.toLowerCase(),
        password: data.password,
      });

      if (!result || result.error) {
        setError("root", { message: result?.error ?? "Invalid credentials" });
        toast.error("Authentication failed", {
          description: "Check your credentials and try again.",
        });
        refreshChallenge();
        return;
      }

      toast.success("Signed in successfully");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
      refreshChallenge();
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

      {/* Glow orbs — blue + red for the red/white/blue theme */}
      <div className="absolute top-1/4 left-1/3 w-[460px] h-[280px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[420px] h-[260px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0a1424] border border-blue-500/30 mb-4 mx-auto overflow-hidden shadow-[0_0_25px_rgba(37,99,235,0.15)]">
            <Image
              src="/images/cloud-securelens-logo.png"
              alt="Cloud SecureLens logo — magnifying glass inspecting a cloud and database"
              width={64}
              height={64}
              priority
              unoptimized
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Cloud Secure<span className="text-blue-400">Lens</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 text-balance">
            Cloud Environment and Databases Security Audit Dashboard
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

            {/* Captcha */}
            <div className="space-y-1.5">
              <label htmlFor="captcha" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Security check
              </label>
              <div className="flex items-stretch gap-2">
                <div className="flex items-center gap-2 px-3 rounded-lg border border-red-500/25 bg-red-500/5 select-none">
                  <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-200 tabular-nums tracking-wide">
                    {challenge.a} + {challenge.b} =
                  </span>
                </div>
                <input
                  id="captcha"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="?"
                  value={captchaInput}
                  onChange={(e) => {
                    setCaptchaInput(e.target.value.replace(/[^0-9]/g, ""));
                    setCaptchaError(null);
                  }}
                  className={cn(
                    "w-20 h-10 px-3 rounded-lg border bg-[#0d1829] text-sm text-center text-slate-200 placeholder:text-slate-600 tabular-nums",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors",
                    captchaError
                      ? "border-red-500/50 focus:ring-red-500/30"
                      : "border-blue-500/20 focus:border-blue-500/40"
                  )}
                />
                <button
                  type="button"
                  onClick={refreshChallenge}
                  aria-label="Get a new security check"
                  className="flex items-center justify-center w-10 h-10 rounded-lg border border-blue-500/20 bg-blue-500/5 text-slate-400 hover:text-blue-300 hover:border-blue-500/40 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {captchaError && (
                <p className="text-xs text-red-400">{captchaError}</p>
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
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6 text-balance">
          Cloud SecureLens · Cloud Environment &amp; Databases Security Audit · v1.0
        </p>
      </div>
    </div>
  );
}
