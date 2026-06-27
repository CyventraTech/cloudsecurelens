import { Shield, Loader2 } from "lucide-react";

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050b14]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}
