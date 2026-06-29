// app/api/iam/route.ts
// GET /api/iam — IAM user security posture from the audit table.

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

    const where: Prisma.IAMAuditWhereInput = {};

    const mfaEnabled = sp.get("mfaEnabled");
    const isRoot = sp.get("isRoot");
    const isActive = sp.get("isActive");
    const riskLevel = sp.get("riskLevel");
    const search = sp.get("search");

    if (mfaEnabled !== null) where.mfaEnabled = mfaEnabled === "true";
    if (isRoot !== null) where.isRoot = isRoot === "true";
    if (isActive !== null) where.isActive = isActive === "true";
    if (riskLevel) where.riskLevel = riskLevel as Prisma.EnumRiskLevelFilter;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { arn: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total, summary] = await Promise.all([
      prisma.iAMAudit.findMany({
        where,
        orderBy: [{ riskLevel: "asc" }, { username: "asc" }],
        skip,
        take,
      }),
      prisma.iAMAudit.count({ where }),
      // Summary stats (always unfiltered)
      prisma.iAMAudit.aggregate({
        _count: { id: true },
        where: {},
      }).then(async (agg) => {
        const [mfaOn, mfaOff, inactive, rootMfa, keyCount] = await Promise.all([
          prisma.iAMAudit.count({ where: { mfaEnabled: true, isRoot: false } }),
          prisma.iAMAudit.count({ where: { mfaEnabled: false, isRoot: false } }),
          prisma.iAMAudit.count({ where: { isActive: false } }),
          prisma.iAMAudit.count({ where: { isRoot: true, mfaEnabled: true } }),
          prisma.iAMAudit.count({ where: { accessKey1Active: true } }),
        ]);
        return {
          totalUsers: agg._count.id,
          mfaEnabled: mfaOn,
          mfaDisabled: mfaOff,
          inactiveUsers: inactive,
          rootMfaEnabled: rootMfa > 0,
          accessKeysActive: keyCount,
        };
      }),
    ]);

    return NextResponse.json(
      apiSuccess({ users, summary }, undefined, buildPaginationMeta(total, page, pageSize))
    );
  } catch (error) {
    console.error("[GET /api/iam]", error);
    return NextResponse.json(apiError("Failed to load IAM data"), { status: 500 });
  }
}
