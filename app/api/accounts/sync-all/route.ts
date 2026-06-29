// app/api/accounts/sync-all/route.ts
// POST /api/accounts/sync-all — sync only accounts whose data is stale.
//
// Called automatically by the app (the dashboard/accounts pages poll this in
// the background) so users never need to click "Sync now". It is staleness-
// gated: an account is only re-synced once it's older than its configured
// syncIntervalMin, so polling does not hammer the AWS APIs.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { apiSuccess, apiError } from "@/lib/utils";
import { syncStaleAccounts } from "@/lib/aws/sync";

export const maxDuration = 300;

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json(apiError("Unauthorized"), { status: 401 });

  try {
    const results = await syncStaleAccounts("auto");
    return NextResponse.json(
      apiSuccess(
        { accountsSynced: results.length, results },
        results.length > 0 ? `Auto-synced ${results.length} account(s)` : "All accounts up to date"
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    console.error("[POST /api/accounts/sync-all]", error);
    return NextResponse.json(apiError(`Auto-sync failed: ${message}`), { status: 500 });
  }
}
