"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, LogIn, Users, Database, Activity,
  Lightbulb, Shield, LogOut, ChevronLeft, ChevronRight,
  Settings, Cloud, HardDrive, Separator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

const MAIN_NAV = [
  { href: "/dashboard",           icon: LayoutDashboard, label: "Dashboard" },
  { href: "/login-audit",         icon: LogIn,           label: "Login Audit" },
  { href: "/iam",                 icon: Users,           label: "IAM Security" },
  { href: "/database-audit",      icon: Database,        label: "Database Audit" },
  { href: "/database-activity",   icon: Activity,        label: "DB Activity" },
  { href: "/recommendations",     icon: Lightbulb,       label: "Recommendations" },
];

const SETTINGS_NAV = [
  { href: "/settings/accounts",  icon: Cloud,     label: "AWS Accounts" },
  { href: "/settings/databases", icon: HardDrive, label: "Databases" },
  { href: "/settings",           icon: Settings,  label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    toast.loading("Signing out…");
    await signOut({ callbackUrl: "/login" });
  }

  function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
          active
            ? "bg-blue-600/20 text-blue-300 border border-blue-500/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
          collapsed && "justify-center px-0 py-2.5"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0", active && "text-blue-400")} />
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
      </Link>
    );
  }

  return (
    <aside className={cn(
      "flex flex-col h-screen sticky top-0 bg-[#0a1628] border-r border-blue-500/10 transition-all duration-300 shrink-0",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-blue-500/10",
        collapsed && "justify-center px-0"
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 shrink-0">
          <Shield className="w-4 h-4 text-blue-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight truncate">SecureLens</p>
            <p className="text-[10px] text-slate-500 truncate">AWS Security</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {/* Main nav */}
        {MAIN_NAV.map((item) => <NavItem key={item.href} {...item} />)}

        {/* Divider */}
        <div className={cn("py-2", collapsed ? "px-3" : "px-1")}>
          <div className="h-px bg-blue-500/10" />
          {!collapsed && (
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-2 mb-1 px-1.5 font-semibold">
              Management
            </p>
          )}
        </div>

        {/* Settings nav */}
        {SETTINGS_NAV.map((item) => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* Bottom */}
      <div className="border-t border-blue-500/10 p-2 space-y-1">
        <button
          onClick={handleSignOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
            "text-slate-500 hover:text-red-400 hover:bg-red-500/10",
            collapsed && "justify-center px-0 py-2.5"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
            "text-slate-600 hover:text-slate-400 hover:bg-white/5",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            : <><ChevronLeft className="w-3.5 h-3.5 shrink-0" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
