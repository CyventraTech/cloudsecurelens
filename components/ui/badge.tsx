import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        critical: "bg-red-500/10 text-red-400 border-red-500/20",
        high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        info: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        outline: "border-slate-600/50 text-slate-400 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
