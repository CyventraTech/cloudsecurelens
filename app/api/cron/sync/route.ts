// app/api/cron/sync/route.ts
// GET /api/cron/sync — scheduled background sync of all active AWS accounts.
//
// Triggered by Vercel Cron in production (see vercel.json). Vercel sends an
// "Authorization: Bearer $CRON_SECRET" header; we verify it so the endpoint
// can't be invoked by anyone else.

import { NextResponse, type NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/utils";
import { syncStaleAccounts } from "@/lib/aws/sync";

// Allow up to 5 minutes for the cron to walk every account.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // In production CRON_SECRET must be set and must match. If it isn't
  // configured we refuse rather than run unauthenticated.
  if (!cronSecret) {
    return NextResponse.json(apiError("CRON_SECRET is not configured"), { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(apiError("Unauthorized"), { status: 401 });
  }

  try {
    const results = await syncStaleAccounts("cron");
    return NextResponse.json(
      apiSuccess(
        { accountsSynced: results.length, results },
        `Cron sync completed for ${results.length} account(s)`
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    console.error("[GET /api/cron/sync]", error);
    return NextResponse.json(apiError(`Cron sync failed: ${message}`), { status: 500 });
  }
}
