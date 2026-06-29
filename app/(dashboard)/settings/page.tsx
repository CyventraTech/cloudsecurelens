import { Settings, Cloud, HardDrive, Shield, Key, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    href: "/settings/users",
    icon: Users,
    title: "User Management",
    description: "Create users, assign roles (Admin, Analyst, Viewer), and reset passwords.",
    badge: "Admin",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    href: "/settings/accounts",
    icon: Cloud,
    title: "AWS Accounts",
    description: "Onboard and manage AWS accounts using IAM roles or access keys.",
    badge: "Admin",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    href: "/settings/databases",
    icon: HardDrive,
    title: "Monitored Databases",
    description: "Register RDS and Aurora databases for activity and audit log monitoring.",
    badge: "Admin",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    href: "/settings/security",
    icon: Shield,
    title: "Security Settings",
    description: "Configure MFA requirements, session timeouts, and access policies.",
    badge: "Coming soon",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/settings/api-keys",
    icon: Key,
    title: "API Keys",
    description: "Manage API keys for programmatic access to Cloud SecureLens data.",
    badge: "Coming soon",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5 animate-slide-in">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" /> Settings
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Configure Cloud SecureLens — accounts, databases, and security policies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="glass-card-hover cursor-pointer h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${s.bg} shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-medium">
                      {s.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{s.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
