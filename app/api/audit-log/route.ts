// app/api/audit-log/route.ts
// GET /api/audit-log — paginated system activity / audit trail.
// Records changes detected during AWS syncs (IAM users & databases added or
// removed) along with who/what triggered them and when.

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

    const where: Prisma.AuditLogWhereInput = {};
    const action = sp.get("action");
    const search = sp.get("search");

    if (action) where.action = action;
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { resource: { contains: search, mode: "insensitive" } },
        { resourceId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          userId: true,
          action: true,
          resource: true,
          resourceId: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Resolve actor display names for the user ids present on this page.
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = logs.map((l) => ({
      ...l,
      actorName: l.userId ? userMap.get(l.userId)?.name ?? "Unknown user" : "System (automatic)",
      actorEmail: l.userId ? userMap.get(l.userId)?.email ?? null : null,
    }));

    return NextResponse.json(
      apiSuccess(enriched, undefined, buildPaginationMeta(total, page, pageSize))
    );
  } catch (error) {
    console.error("[GET /api/audit-log]", error);
    return NextResponse.json(apiError("Failed to load audit trail"), { status: 500 });
  }
}
