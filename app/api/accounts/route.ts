// app/api/accounts/route.ts
// GET  /api/accounts  — list all onboarded AWS accounts
// POST /api/accounts  — onboard a new AWS account

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { encrypt } from "@/lib/crypto/encrypt";
import { z } from "zod";

const createAccountSchema = z.object({
  accountId:   z.string().regex(/^\d{12}$/, "Must be a 12-digit AWS account ID"),
  accountName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  environment: z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "SANDBOX"]).default("PRODUCTION"),
  region:      z.string().default("us-east-1"),
  // Role-based auth (preferred)
  roleArn:     z.string().regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Invalid role ARN format").optional(),
  externalId:  z.string().max(128).optional(),
  // Direct credentials (fallback)
  accessKeyId:     z.string().regex(/^AKIA[A-Z0-9]{16}$/, "Invalid access key format").optional(),
  secretAccessKey: z.string().min(1).optional(),
}).refine(
  (d) => d.roleArn || (d.accessKeyId && d.secretAccessKey),
  { message: "Provide either a Role ARN or both Access Key ID and Secret Access Key" }
);

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  try {
    const accounts = await prisma.awsAccount.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        accountId: true,
        accountName: true,
        description: true,
        environment: true,
        region: true,
        roleArn: true,
        // Never return raw keys — only whether they exist
        accessKeyId: false,
        secretAccessKey: false,
        status: true,
        lastSyncAt: true,
        lastSyncError: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            loginAudits:        true,
            iamAudits:          true,
            databaseAudits:     true,
            monitoredDatabases: true,
            recommendations:    true,
          },
        },
      },
    });

    // Flag whether direct creds exist (without exposing values)
    const withCredFlags = await Promise.all(
      accounts.map(async (a) => {
        const raw = await prisma.awsAccount.findUnique({
          where: { id: a.id },
          select: { accessKeyId: true, secretAccessKey: true },
        });
        return {
          ...a,
          hasDirectCredentials: !!(raw?.accessKeyId && raw?.secretAccessKey),
          authType: a.roleArn ? "ROLE" : "KEYS",
        };
      })
    );

    return NextResponse.json(apiSuccess(withCredFlags));
  } catch (error) {
    console.error("[GET /api/accounts]", error);
    return NextResponse.json(apiError("Failed to load accounts"), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  // Only admins can onboard accounts
  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") {
    return NextResponse.json(apiError("Only admins can onboard AWS accounts"), { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.issues.map((i) => i.message).join("; ")),
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate
    const existing = await prisma.awsAccount.findUnique({
      where: { accountId: data.accountId },
    });
    if (existing) {
      return NextResponse.json(
        apiError(`AWS account ${data.accountId} is already onboarded`),
        { status: 409 }
      );
    }

    // Encrypt credentials before storing
    const account = await prisma.awsAccount.create({
      data: {
        accountId:       data.accountId,
        accountName:     data.accountName,
        description:     data.description,
        environment:     data.environment,
        region:          data.region,
        roleArn:         data.roleArn ?? null,
        externalId:      data.externalId ?? null,
        // Encrypt sensitive values — never store plaintext
        accessKeyId:     data.accessKeyId     ? encrypt(data.accessKeyId)     : null,
        secretAccessKey: data.secretAccessKey ? encrypt(data.secretAccessKey) : null,
        status:          "PENDING",
        createdBy:       (session.user as { id?: string }).id,
      },
      select: {
        id: true,
        accountId: true,
        accountName: true,
        environment: true,
        region: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      apiSuccess(account, "AWS account onboarded successfully"),
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/accounts]", error);
    return NextResponse.json(apiError("Failed to onboard account"), { status: 500 });
  }
}
