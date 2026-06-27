// app/api/login-audit/route.ts
// GET /api/login-audit — paginated, filterable login events from CloudTrail.

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError, getPaginationParams, buildPaginationMeta } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(apiError("Unauthorized"), { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const { page, pageSize, skip, take } = getPaginationParams(sp);

    // Build dynamic where clause
    const where: Prisma.LoginAuditWhereInput = {};

    const eventType = sp.get("eventType");
    const loginResult = sp.get("loginResult");
    const username = sp.get("username");
    const sourceIp = sp.get("sourceIp");
    const region = sp.get("region");
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");
    const search = sp.get("search");

    if (eventType) where.eventType = eventType as Prisma.EnumLoginEventTypeFilter;
    if (loginResult) where.loginResult = loginResult as Prisma.EnumLoginResultFilter;
    if (region) where.region = region;

    if (username) where.username = { contains: username, mode: "insensitive" };
    if (sourceIp) where.sourceIp = { contains: sourceIp };

    if (dateFrom || dateTo) {
      where.eventTime = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { sourceIp: { contains: search } },
        { region: { contains: search, mode: "insensitive" } },
        { errorCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.loginAudit.findMany({
        where,
        orderBy: { eventTime: "desc" },
        skip,
        take,
        select: {
          id: true,
          eventId: true,
          eventType: true,
          eventTime: true,
          username: true,
          sourceIp: true,
          userAgent: true,
          region: true,
          mfaUsed: true,
          loginResult: true,
          errorCode: true,
          errorMessage: true,
          awsAccountId: true,
          createdAt: true,
        },
      }),
      prisma.loginAudit.count({ where }),
    ]);

    return NextResponse.json(
      apiSuccess(events, undefined, buildPaginationMeta(total, page, pageSize))
    );
  } catch (error) {
    console.error("[GET /api/login-audit]", error);
    return NextResponse.json(apiError("Failed to load login audit data"), { status: 500 });
  }
}
