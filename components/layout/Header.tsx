"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

// Map pathnames to breadcrumb labels
const PAGE_LABELS: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/login-audit":         "Login Audit",
  "/iam":                 "IAM Security",
  "/database-audit":      "Database Audit",
  "/database-activity":   "Database Activity",
  "/recommendations":     "Recommendations",
  "/settings":            "Settings",
  "/settings/accounts":   "AWS Accounts",
  "/settings/databases":  "Databases",
  "/settings/security":   "Security Settings",
  "/settings/api-keys":   "API Keys",
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function Header() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const pageLabel = PAGE_LABELS[pathname] ?? "Cloud SecureLens";

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-5 bg-[#050b14]/90 backdrop-blur-md border-b border-blue-500/10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Cloud SecureLens</span>
        <span className="text-slate-700">/</span>
        <span className="text-slate-200 font-medium">{pageLabel}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell — placeholder */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {/* Badge */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
        </button>

        {/* Profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
              "hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            )}>
              <Avatar className="w-7 h-7">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-200 leading-tight max-w-[120px] truncate">
                  {user?.name ?? user?.email ?? "User"}
                </p>
                <p className="text-[10px] text-slate-500 capitalize leading-tight">
                  {user?.role?.toLowerCase() ?? "viewer"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium text-white truncate">
                  {user?.name ?? "User"}
                </p>
                <p className="text-xs text-slate-500 font-normal truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
