// app/api/database-activity/route.ts
// GET /api/database-activity — query-level events from Aurora.

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError, getPaginationParams, buildPaginationMeta } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import { subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(apiError("Unauthorized"), { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const { page, pageSize, skip, take } = getPaginationParams(sp);

    const where: Prisma.DatabaseActivityWhereInput = {};

    const dbId = sp.get("dbIdentifier");
    const queryType = sp.get("queryType");
    const success = sp.get("success");
    const username = sp.get("username");
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");
    const search = sp.get("search");

    if (dbId) where.dbIdentifier = dbId;
    if (queryType) where.queryType = queryType as Prisma.EnumQueryTypeFilter;
    if (success !== null) where.success = success === "true";
    if (username) where.username = { contains: username, mode: "insensitive" };
    if (dateFrom || dateTo) {
      where.recordedAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { databaseName: { contains: search, mode: "insensitive" } },
        { queryText: { contains: search, mode: "insensitive" } },
      ];
    }

    const now = new Date();
    const [activities, total, stats] = await Promise.all([
      prisma.databaseActivity.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        skip,
        take,
      }),
      prisma.databaseActivity.count({ where }),
      // Stats (unfiltered, last 24h)
      (async () => {
        const last24h = subDays(now, 1);
        const [total24h, failed, slowCount, breakdown, topUsers] = await Promise.all([
          prisma.databaseActivity.count({ where: { recordedAt: { gte: last24h } } }),
          prisma.databaseActivity.count({ where: { success: false, recordedAt: { gte: last24h } } }),
          prisma.databaseActivity.count({ where: { durationMs: { gt: 1000 }, recordedAt: { gte: last24h } } }),
          prisma.databaseActivity.groupBy({
            by: ["queryType"],
            _count: { queryType: true },
            where: { recordedAt: { gte: last24h } },
          }),
          prisma.databaseActivity.groupBy({
            by: ["username"],
            _count: { username: true },
            where: { recordedAt: { gte: last24h }, username: { not: null } },
            orderBy: { _count: { username: "desc" } },
            take: 5,
          }),
        ]);
        return {
          totalQueries: total24h,
          failedQueries: failed,
          slowQueries: slowCount,
          queryTypeBreakdown: breakdown.map((b) => ({
            type: b.queryType,
            count: b._count.queryType,
          })),
          topUsers: topUsers.map((u) => ({
            username: u.username ?? "unknown",
            queryCount: u._count.username,
          })),
        };
      })(),
    ]);

    return NextResponse.json(
      apiSuccess({ activities, stats }, undefined, buildPaginationMeta(total, page, pageSize))
    );
  } catch (error) {
    console.error("[GET /api/database-activity]", error);
    return NextResponse.json(apiError("Failed to load database activity"), { status: 500 });
  }
}
