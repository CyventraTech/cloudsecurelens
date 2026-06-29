// app/api/accounts/[id]/route.ts
// GET    /api/accounts/:id  — get one account (no raw creds)
// PATCH  /api/accounts/:id  — update account
// DELETE /api/accounts/:id  — remove account

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { encrypt } from "@/lib/crypto/encrypt";
import { z } from "zod";

const updateSchema = z.object({
  accountName:     z.string().min(1).max(100).optional(),
  description:     z.string().max(500).optional(),
  environment:     z.enum(["PRODUCTION","STAGING","DEVELOPMENT","SANDBOX"]).optional(),
  region:          z.string().optional(),
  roleArn:         z.string().optional().nullable(),
  externalId:      z.string().optional().nullable(),
  accessKeyId:     z.string().optional().nullable(),
  secretAccessKey: z.string().optional().nullable(),
  isActive:        z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  const { id } = await params;

  try {
    const account = await prisma.awsAccount.findUnique({
      where: { id },
      select: {
        id: true, accountId: true, accountName: true, description: true,
        environment: true, region: true, roleArn: true, externalId: true,
        status: true, lastSyncAt: true, lastSyncError: true,
        syncIntervalMin: true, isActive: true, tags: true,
        createdAt: true, updatedAt: true,
        _count: {
          select: {
            loginAudits: true, iamAudits: true,
            databaseAudits: true, monitoredDatabases: true,
          },
        },
        monitoredDatabases: {
          select: {
            id: true, dbIdentifier: true, displayName: true,
            engine: true, status: true, isActive: true,
          },
        },
      },
    });

    if (!account) return NextResponse.json(apiError("Account not found"), { status: 404 });

    // Add credential presence flags
    const raw = await prisma.awsAccount.findUnique({
      where: { id },
      select: { accessKeyId: true },
    });

    return NextResponse.json(apiSuccess({
      ...account,
      authType: account.roleArn ? "ROLE" : "KEYS",
      hasDirectCredentials: !!raw?.accessKeyId,
    }));
  } catch (error) {
    console.error("[GET /api/accounts/:id]", error);
    return NextResponse.json(apiError("Failed to load account"), { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") {
    return NextResponse.json(apiError("Admins only"), { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.issues.map((i) => i.message).join("; ")),
        { status: 400 }
      );
    }

    const d = parsed.data;

    const updated = await prisma.awsAccount.update({
      where: { id },
      data: {
        ...(d.accountName     !== undefined && { accountName: d.accountName }),
        ...(d.description     !== undefined && { description: d.description }),
        ...(d.environment     !== undefined && { environment: d.environment }),
        ...(d.region          !== undefined && { region: d.region }),
        ...(d.roleArn         !== undefined && { roleArn: d.roleArn }),
        ...(d.externalId      !== undefined && { externalId: d.externalId }),
        ...(d.isActive        !== undefined && { isActive: d.isActive }),
        // Re-encrypt if new credentials are provided
        ...(d.accessKeyId     !== undefined && {
          accessKeyId: d.accessKeyId ? encrypt(d.accessKeyId) : null,
        }),
        ...(d.secretAccessKey !== undefined && {
          secretAccessKey: d.secretAccessKey ? encrypt(d.secretAccessKey) : null,
        }),
        // Reset to PENDING so the next sync re-validates
        ...(d.roleArn !== undefined || d.accessKeyId !== undefined
          ? { status: "PENDING" as const }
          : {}),
      },
      select: {
        id: true, accountId: true, accountName: true,
        status: true, updatedAt: true,
      },
    });

    return NextResponse.json(apiSuccess(updated, "Account updated"));
  } catch (error) {
    console.error("[PATCH /api/accounts/:id]", error);
    return NextResponse.json(apiError("Failed to update account"), { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") {
    return NextResponse.json(apiError("Admins only"), { status: 403 });
  }

  const { id } = await params;

  try {
    // Soft-delete — disable rather than destroy audit history
    await prisma.awsAccount.update({
      where: { id },
      data: { isActive: false, status: "DISABLED" },
    });

    return NextResponse.json(apiSuccess(null, "Account disabled"));
  } catch (error) {
    console.error("[DELETE /api/accounts/:id]", error);
    return NextResponse.json(apiError("Failed to disable account"), { status: 500 });
  }
}
