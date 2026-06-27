// lib/utils.ts
// Shared utility functions used across the application.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { ApiResponse, PaginationMeta } from "@/types";

// ─── Tailwind ────────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── API response helpers ────────────────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  message?: string,
  meta?: PaginationMeta
): ApiResponse<T> {
  return { success: true, data, message, meta };
}

export function apiError(error: string): ApiResponse {
  return { success: false, error };
}

// ─── Date formatting ─────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM dd, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM dd, yyyy HH:mm:ss");
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm:ss");
}

// ─── Number / string helpers ─────────────────────────────────────────────────

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

export function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip;
}

// ─── Security score ───────────────────────────────────────────────────────────

export function calculateSecurityScore(findings: {
  mfaDisabledUsers: number;
  totalUsers: number;
  publicDatabases: number;
  unencryptedDatabases: number;
  totalDatabases: number;
  criticalRecommendations: number;
  highRecommendations: number;
  rootAccountUsedLast30Days: boolean;
  accessKeysUnrotated: number;
}): number {
  let score = 100;

  if (findings.totalUsers > 0) {
    const mfaCoverage = 1 - findings.mfaDisabledUsers / findings.totalUsers;
    score -= Math.round((1 - mfaCoverage) * 20);
  }

  score -= findings.publicDatabases * 15;

  if (findings.totalDatabases > 0) {
    const encCoverage = 1 - findings.unencryptedDatabases / findings.totalDatabases;
    score -= Math.round((1 - encCoverage) * 10);
  }

  score -= findings.criticalRecommendations * 5;
  score -= findings.highRecommendations * 2;

  if (findings.rootAccountUsedLast30Days) score -= 15;

  score -= Math.min(findings.accessKeysUnrotated * 3, 15);

  return Math.max(0, Math.min(100, score));
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function getSeverityLabel(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low", INFO: "Info",
  };
  return map[severity] ?? severity;
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: "text-red-400 bg-red-400/10 border-red-400/20",
    HIGH:     "text-orange-400 bg-orange-400/10 border-orange-400/20",
    MEDIUM:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    LOW:      "text-blue-400 bg-blue-400/10 border-blue-400/20",
    INFO:     "text-slate-400 bg-slate-400/10 border-slate-400/20",
  };
  return map[severity] ?? "text-slate-400 bg-slate-400/10 border-slate-400/20";
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function getPaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number
): PaginationMeta {
  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
