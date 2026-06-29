// app/api/accounts/[id]/sync/route.ts
// POST /api/accounts/:id/sync — trigger an immediate AWS data sync

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { syncAwsAccount } from "@/lib/aws/sync";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  const { id } = await params;

  try {
    const account = await prisma.awsAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json(apiError("Account not found"), { status: 404 });
    if (!account.isActive) return NextResponse.json(apiError("Account is disabled"), { status: 400 });

    const result = await syncAwsAccount(account, session.user.id ?? "manual");

    return NextResponse.json(apiSuccess(result, "Sync completed successfully"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    console.error("[POST /api/accounts/:id/sync]", error);
    return NextResponse.json(apiError(`Sync failed: ${message}`), { status: 500 });
  }
}
