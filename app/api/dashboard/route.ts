// app/api/dashboard/route.ts
// GET /api/dashboard — returns stats and chart data for the main dashboard.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError, calculateSecurityScore } from "@/lib/utils";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(apiError("Unauthorized"), { status: 401 });
  }

  try {
    const now = new Date();
    const last24h = subDays(now, 1);
    const last30d = subDays(now, 30);

    // ── Parallel queries ────────────────────────────────────────────────────
    const [
      totalIamUsers,
      mfaDisabledUsers,
      rootLoginLast30d,
      auroraDatabases,
      publicDatabases,
      unencryptedDbs,
      failedLoginsLast24h,
      openCriticalRecs,
      openHighRecs,
      openRecommendations,
      accessKeysUnrotated,
      loginTrend7d,
      failedLoginTrend7d,
      topSourceIps,
      queryTypeBreakdown,
    ] = await Promise.all([
      // IAM
      prisma.iAMAudit.count(),
      prisma.iAMAudit.count({ where: { mfaEnabled: false, isRoot: false } }),
      prisma.loginAudit.count({
        where: { eventType: "ROOT_LOGIN", eventTime: { gte: last30d } },
      }),
      // Databases
      prisma.databaseAudit.count(),
      prisma.databaseAudit.count({ where: { publiclyAccessible: true } }),
      prisma.databaseAudit.count({ where: { storageEncrypted: false } }),
      // Login security
      prisma.loginAudit.count({
        where: { loginResult: "FAILURE", eventTime: { gte: last24h } },
      }),
      // Recommendations
      prisma.recommendation.count({ where: { severity: "CRITICAL", status: "OPEN" } }),
      prisma.recommendation.count({ where: { severity: "HIGH", status: "OPEN" } }),
      prisma.recommendation.count({ where: { status: "OPEN" } }),
      // Access keys older than 90 days
      prisma.iAMAudit.count({
        where: {
          accessKey1Active: true,
          accessKey1LastRotated: { lt: subDays(now, 90) },
        },
      }),
      // Login trend last 7 days
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const day = subDays(now, 6 - i);
          const start = startOfDay(day);
          const end = startOfDay(subDays(day, -1));
          return prisma.loginAudit
            .count({ where: { loginResult: "SUCCESS", eventTime: { gte: start, lt: end } } })
            .then((count) => ({ date: format(day, "MMM d"), value: count }));
        })
      ),
      // Failed login trend last 7 days
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const day = subDays(now, 6 - i);
          const start = startOfDay(day);
          const end = startOfDay(subDays(day, -1));
          return prisma.loginAudit
            .count({ where: { loginResult: "FAILURE", eventTime: { gte: start, lt: end } } })
            .then((count) => ({ date: format(day, "MMM d"), value: count }));
        })
      ),
      // Top source IPs
      prisma.loginAudit.groupBy({
        by: ["sourceIp"],
        _count: { sourceIp: true },
        where: { sourceIp: { not: null } },
        orderBy: { _count: { sourceIp: "desc" } },
        take: 8,
      }),
      // Query type breakdown
      prisma.databaseActivity.groupBy({
        by: ["queryType"],
        _count: { queryType: true },
        orderBy: { _count: { queryType: "desc" } },
      }),
    ]);

    // ── Security score ──────────────────────────────────────────────────────
    const securityScore = calculateSecurityScore({
      mfaDisabledUsers,
      totalUsers: totalIamUsers,
      publicDatabases,
      unencryptedDatabases: unencryptedDbs,
      totalDatabases: auroraDatabases,
      criticalRecommendations: openCriticalRecs,
      highRecommendations: openHighRecs,
      rootAccountUsedLast30Days: rootLoginLast30d > 0,
      accessKeysUnrotated,
    });

    // ── Query distribution ──────────────────────────────────────────────────
    const totalQueries = queryTypeBreakdown.reduce((s, q) => s + q._count.queryType, 0);
    const queryTypeDistribution = queryTypeBreakdown.map((q) => ({
      type: q.queryType,
      count: q._count.queryType,
      percentage: totalQueries > 0
        ? Math.round((q._count.queryType / totalQueries) * 100)
        : 0,
    }));

    return NextResponse.json(
      apiSuccess({
        stats: {
          securityScore,
          totalIamUsers,
          mfaDisabledUsers,
          auroraDatabases,
          publicDatabases,
          failedLoginsLast24h,
          criticalAlerts: openCriticalRecs,
          openRecommendations,
          rootAccountUsage: rootLoginLast30d > 0,
          accessKeysUnrotated,
        },
        charts: {
          loginTrend: loginTrend7d,
          failedLoginTrend: failedLoginTrend7d,
          topSourceIps: topSourceIps.map((r) => ({
            ip: r.sourceIp ?? "Unknown",
            count: r._count.sourceIp,
          })),
          queryTypeDistribution,
        },
      })
    );
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(apiError("Failed to load dashboard data"), { status: 500 });
  }
}
