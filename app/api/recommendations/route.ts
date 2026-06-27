// app/api/recommendations/route.ts
// GET /api/recommendations — AI-generated security recommendations.

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

    const where: Prisma.RecommendationWhereInput = {};

    const severity = sp.get("severity");
    const category = sp.get("category");
    const status = sp.get("status");
    const search = sp.get("search");

    if (severity) where.severity = severity as Prisma.EnumSeverityFilter;
    if (category) where.category = category as Prisma.EnumRecommendationCategoryFilter;
    if (status) where.status = status as Prisma.EnumRecommendationStatusFilter;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { resource: { contains: search, mode: "insensitive" } },
      ];
    }

    const [recommendations, total, stats] = await Promise.all([
      prisma.recommendation.findMany({
        where,
        orderBy: [
          { severity: "asc" },
          { status: "asc" },
          { createdAt: "desc" },
        ],
        skip,
        take,
      }),
      prisma.recommendation.count({ where }),
      // Stats (unfiltered)
      (async () => {
        const [total, open, inProgress, resolved, critical, high, medium, low] =
          await Promise.all([
            prisma.recommendation.count(),
            prisma.recommendation.count({ where: { status: "OPEN" } }),
            prisma.recommendation.count({ where: { status: "IN_PROGRESS" } }),
            prisma.recommendation.count({ where: { status: "RESOLVED" } }),
            prisma.recommendation.count({ where: { severity: "CRITICAL" } }),
            prisma.recommendation.count({ where: { severity: "HIGH" } }),
            prisma.recommendation.count({ where: { severity: "MEDIUM" } }),
            prisma.recommendation.count({ where: { severity: "LOW" } }),
          ]);
        return { total, open, inProgress, resolved, critical, high, medium, low };
      })(),
    ]);

    return NextResponse.json(
      apiSuccess({ recommendations, stats }, undefined, buildPaginationMeta(total, page, pageSize))
    );
  } catch (error) {
    console.error("[GET /api/recommendations]", error);
    return NextResponse.json(apiError("Failed to load recommendations"), { status: 500 });
  }
}

// PATCH /api/recommendations — update status of a recommendation
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(apiError("Unauthorized"), { status: 401 });
  }

  try {
    const body = await req.json() as { id: string; status: string };
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(apiError("id and status are required"), { status: 400 });
    }

    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "IGNORED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(apiError("Invalid status value"), { status: 400 });
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED",
        resolvedAt: status === "RESOLVED" ? new Date() : null,
        resolvedBy: status === "RESOLVED" ? (session.user.email ?? undefined) : null,
      },
    });

    return NextResponse.json(apiSuccess(updated, "Status updated"));
  } catch (error) {
    console.error("[PATCH /api/recommendations]", error);
    return NextResponse.json(apiError("Failed to update recommendation"), { status: 500 });
  }
}
