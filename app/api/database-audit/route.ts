// app/api/database-audit/route.ts
// GET /api/database-audit — Aurora RDS security posture.

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

    const where: Prisma.DatabaseAuditWhereInput = {};

    const encrypted = sp.get("storageEncrypted");
    const publicAccess = sp.get("publiclyAccessible");
    const iamAuth = sp.get("iamDatabaseAuthEnabled");
    const riskLevel = sp.get("riskLevel");
    const search = sp.get("search");

    if (encrypted !== null) where.storageEncrypted = encrypted === "true";
    if (publicAccess !== null) where.publiclyAccessible = publicAccess === "true";
    if (iamAuth !== null) where.iamDatabaseAuthEnabled = iamAuth === "true";
    if (riskLevel) where.riskLevel = riskLevel as Prisma.EnumRiskLevelFilter;
    if (search) {
      where.OR = [
        { dbIdentifier: { contains: search, mode: "insensitive" } },
        { dbName: { contains: search, mode: "insensitive" } },
        { engine: { contains: search, mode: "insensitive" } },
      ];
    }

    const [databases, total] = await Promise.all([
      prisma.databaseAudit.findMany({
        where,
        orderBy: [{ riskLevel: "asc" }, { dbIdentifier: "asc" }],
        skip,
        take,
      }),
      prisma.databaseAudit.count({ where }),
    ]);

    return NextResponse.json(
      apiSuccess(databases, undefined, buildPaginationMeta(total, page, pageSize))
    );
  } catch (error) {
    console.error("[GET /api/database-audit]", error);
    return NextResponse.json(apiError("Failed to load database audit data"), { status: 500 });
  }
}
