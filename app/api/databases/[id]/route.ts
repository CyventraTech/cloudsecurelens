// app/api/databases/[id]/route.ts
// PATCH  /api/databases/:id  — update database config
// DELETE /api/databases/:id  — disable monitoring

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { encrypt } from "@/lib/crypto/encrypt";
import { z } from "zod";

const updateSchema = z.object({
  displayName:          z.string().min(1).max(100).optional(),
  description:          z.string().max(500).optional(),
  host:                 z.string().optional(),
  port:                 z.number().int().optional(),
  dbUsername:           z.string().optional().nullable(),
  dbPassword:           z.string().optional().nullable(),
  sslEnabled:           z.boolean().optional(),
  enableActivityLogs:   z.boolean().optional(),
  enableAuditLogs:      z.boolean().optional(),
  enableSlowQueryLogs:  z.boolean().optional(),
  slowQueryThresholdMs: z.number().int().optional(),
  isActive:             z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") return NextResponse.json(apiError("Admins only"), { status: 403 });

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

    const updated = await prisma.monitoredDatabase.update({
      where: { id },
      data: {
        ...(d.displayName          !== undefined && { displayName: d.displayName }),
        ...(d.description          !== undefined && { description: d.description }),
        ...(d.host                 !== undefined && { host: d.host ? encrypt(d.host) : null }),
        ...(d.port                 !== undefined && { port: d.port }),
        ...(d.dbUsername           !== undefined && { dbUsername: d.dbUsername ? encrypt(d.dbUsername) : null }),
        ...(d.dbPassword           !== undefined && { dbPassword: d.dbPassword ? encrypt(d.dbPassword) : null }),
        ...(d.sslEnabled           !== undefined && { sslEnabled: d.sslEnabled }),
        ...(d.enableActivityLogs   !== undefined && { enableActivityLogs: d.enableActivityLogs }),
        ...(d.enableAuditLogs      !== undefined && { enableAuditLogs: d.enableAuditLogs }),
        ...(d.enableSlowQueryLogs  !== undefined && { enableSlowQueryLogs: d.enableSlowQueryLogs }),
        ...(d.slowQueryThresholdMs !== undefined && { slowQueryThresholdMs: d.slowQueryThresholdMs }),
        ...(d.isActive             !== undefined && { isActive: d.isActive }),
        // Reset status when credentials change
        ...(d.host || d.dbPassword ? { status: "PENDING" as const } : {}),
      },
      select: { id: true, displayName: true, status: true, updatedAt: true },
    });

    return NextResponse.json(apiSuccess(updated, "Database updated"));
  } catch (error) {
    console.error("[PATCH /api/databases/:id]", error);
    return NextResponse.json(apiError("Failed to update database"), { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") return NextResponse.json(apiError("Admins only"), { status: 403 });

  const { id } = await params;

  try {
    await prisma.monitoredDatabase.update({
      where: { id },
      data: { isActive: false, status: "DISABLED" },
    });
    return NextResponse.json(apiSuccess(null, "Database monitoring disabled"));
  } catch (error) {
    console.error("[DELETE /api/databases/:id]", error);
    return NextResponse.json(apiError("Failed to disable database"), { status: 500 });
  }
}
