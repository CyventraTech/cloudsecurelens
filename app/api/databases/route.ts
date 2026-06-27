// app/api/databases/route.ts
// GET  /api/databases  — list all monitored databases
// POST /api/databases  — register a new database for monitoring

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { encrypt } from "@/lib/crypto/encrypt";
import { z } from "zod";

const createDbSchema = z.object({
  awsAccountId:        z.string().min(1),
  dbIdentifier:        z.string().min(1).max(100),
  displayName:         z.string().min(1).max(100),
  description:         z.string().max(500).optional(),
  engine:              z.enum([
    "AURORA_POSTGRESQL","AURORA_MYSQL","RDS_POSTGRESQL",
    "RDS_MYSQL","RDS_SQLSERVER","RDS_ORACLE",
  ]),
  host:                z.string().min(1),
  port:                z.number().int().min(1).max(65535).default(5432),
  databaseName:        z.string().min(1),
  region:              z.string().default("us-east-1"),
  authType:            z.enum(["PASSWORD","IAM","SECRET"]).default("PASSWORD"),
  dbUsername:          z.string().optional(),
  dbPassword:          z.string().optional(),
  sslEnabled:          z.boolean().default(true),
  enableActivityLogs:  z.boolean().default(true),
  enableAuditLogs:     z.boolean().default(true),
  enableSlowQueryLogs: z.boolean().default(true),
  slowQueryThresholdMs: z.number().int().min(100).default(1000),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  try {
    const awsAccountId = req.nextUrl.searchParams.get("awsAccountId");

    const databases = await prisma.monitoredDatabase.findMany({
      where: {
        ...(awsAccountId ? { awsAccountId } : {}),
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        awsAccountId: true,
        dbIdentifier: true,
        displayName: true,
        description: true,
        engine: true,
        port: true,
        databaseName: true,
        region: true,
        authType: true,
        sslEnabled: true,
        enableActivityLogs: true,
        enableAuditLogs: true,
        enableSlowQueryLogs: true,
        slowQueryThresholdMs: true,
        status: true,
        lastCheckedAt: true,
        lastError: true,
        isActive: true,
        createdAt: true,
        // Never return host/password — only presence flag
        host: false,
        dbUsername: false,
        dbPassword: false,
        awsAccount: {
          select: { accountName: true, environment: true },
        },
      },
    });

    // Add presence flags for sensitive fields
    const withFlags = await Promise.all(
      databases.map(async (db) => {
        const raw = await prisma.monitoredDatabase.findUnique({
          where: { id: db.id },
          select: { host: true, dbUsername: true, dbPassword: true },
        });
        return {
          ...db,
          hasHost:        !!raw?.host,
          hasCredentials: !!(raw?.dbUsername && raw?.dbPassword),
        };
      })
    );

    return NextResponse.json(apiSuccess(withFlags));
  } catch (error) {
    console.error("[GET /api/databases]", error);
    return NextResponse.json(apiError("Failed to load databases"), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  const user = session.user as { role?: string; id?: string };
  if (user.role !== "ADMIN") {
    return NextResponse.json(apiError("Admins only"), { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createDbSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.issues.map((i) => i.message).join("; ")),
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Verify AWS account exists
    const awsAccount = await prisma.awsAccount.findUnique({
      where: { accountId: d.awsAccountId },
    });
    if (!awsAccount) {
      return NextResponse.json(apiError("AWS account not found"), { status: 404 });
    }

    // Check for duplicate
    const existing = await prisma.monitoredDatabase.findUnique({
      where: {
        awsAccountId_dbIdentifier: {
          awsAccountId: d.awsAccountId,
          dbIdentifier: d.dbIdentifier,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        apiError(`Database ${d.dbIdentifier} is already registered for this account`),
        { status: 409 }
      );
    }

    const database = await prisma.monitoredDatabase.create({
      data: {
        awsAccountId:         d.awsAccountId,
        dbIdentifier:         d.dbIdentifier,
        displayName:          d.displayName,
        description:          d.description,
        engine:               d.engine,
        host:                 encrypt(d.host),        // encrypted
        port:                 d.port,
        databaseName:         d.databaseName,
        region:               d.region,
        authType:             d.authType,
        dbUsername:           d.dbUsername ? encrypt(d.dbUsername) : null,
        dbPassword:           d.dbPassword ? encrypt(d.dbPassword) : null,
        sslEnabled:           d.sslEnabled,
        enableActivityLogs:   d.enableActivityLogs,
        enableAuditLogs:      d.enableAuditLogs,
        enableSlowQueryLogs:  d.enableSlowQueryLogs,
        slowQueryThresholdMs: d.slowQueryThresholdMs,
        status:               "PENDING",
        createdBy:            user.id,
      },
      select: {
        id: true, dbIdentifier: true, displayName: true,
        engine: true, status: true, createdAt: true,
      },
    });

    return NextResponse.json(
      apiSuccess(database, "Database registered successfully"),
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/databases]", error);
    return NextResponse.json(apiError("Failed to register database"), { status: 500 });
  }
}
