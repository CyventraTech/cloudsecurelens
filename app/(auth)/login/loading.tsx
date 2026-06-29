import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050b14]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-[#0a1424] border border-blue-500/30 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(37,99,235,0.15)]">
            <Image
              src="/images/cloud-securelens-logo.png"
              alt="Cloud SecureLens logo"
              width={56}
              height={56}
              priority
              unoptimized
              className="w-14 h-14 object-contain"
            />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}
