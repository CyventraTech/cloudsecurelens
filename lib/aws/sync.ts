// lib/aws/sync.ts
// Shared AWS account sync logic used by:
//   - the manual "Sync now" route (POST /api/accounts/:id/sync)
//   - the scheduled cron job        (GET  /api/cron/sync)
//   - the client staleness trigger  (POST /api/accounts/sync-all)
//
// Every sync records an audit trail: created / removed IAM users and
// databases are written to the AuditLog table with a timestamp, so the
// Audit Trail page can show exactly what changed and when.

import { prisma } from "@/lib/db/client";
import { decrypt } from "@/lib/crypto/encrypt";
import {
  STSClient,
  AssumeRoleCommand,
} from "@aws-sdk/client-sts";
import {
  IAMClient,
  ListUsersCommand,
} from "@aws-sdk/client-iam";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
} from "@aws-sdk/client-rds";
import type { AwsAccount } from "@prisma/client";

export interface SyncResult {
  accountId: string;
  accountName: string;
  iamUsersSynced: number;
  iamUsersAdded: number;
  iamUsersRemoved: number;
  dbInstancesSynced: number;
  dbInstancesAdded: number;
  dbInstancesRemoved: number;
  clustersSynced: number;
}

// Audit-log action names (kept as constants so the viewer can label them).
export const AUDIT_ACTIONS = {
  IAM_USER_ADDED: "IAM_USER_ADDED",
  IAM_USER_REMOVED: "IAM_USER_REMOVED",
  DB_ADDED: "DB_ADDED",
  DB_REMOVED: "DB_REMOVED",
  ACCOUNT_SYNCED: "ACCOUNT_SYNCED",
  SYNC_FAILED: "SYNC_FAILED",
} as const;

function evaluateDbRisk(
  publiclyAccessible: boolean,
  storageEncrypted: boolean,
  backupRetentionPeriod: number
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (publiclyAccessible && !storageEncrypted) return "CRITICAL";
  if (publiclyAccessible) return "HIGH";
  if (!storageEncrypted) return "HIGH";
  if (backupRetentionPeriod < 7) return "MEDIUM";
  return "LOW";
}

/**
 * Run a full sync for a single AWS account.
 * @param account  the AwsAccount row to sync
 * @param triggeredBy  who/what initiated the sync (userId, "cron", "auto")
 */
export async function syncAwsAccount(
  account: AwsAccount,
  triggeredBy: string
): Promise<SyncResult> {
  if (!account.isActive) throw new Error("Account is disabled");

  // Mark sync in progress
  await prisma.awsAccount.update({
    where: { id: account.id },
    data: { status: "PENDING", lastSyncError: null },
  });

  try {
    // ── Resolve AWS credentials ──────────────────────────────────────────
    let credentials:
      | { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
      | undefined;

    if (account.roleArn) {
      const sts = new STSClient({
        region: account.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      const assumed = await sts.send(
        new AssumeRoleCommand({
          RoleArn: account.roleArn,
          RoleSessionName: "CloudSecureLensSync",
          ExternalId: account.externalId ?? undefined,
          DurationSeconds: 900,
        })
      );
      if (!assumed.Credentials) throw new Error("STS AssumeRole returned no credentials");
      credentials = {
        accessKeyId: assumed.Credentials.AccessKeyId!,
        secretAccessKey: assumed.Credentials.SecretAccessKey!,
        sessionToken: assumed.Credentials.SessionToken,
      };
    } else if (account.accessKeyId && account.secretAccessKey) {
      credentials = {
        accessKeyId: decrypt(account.accessKeyId),
        secretAccessKey: decrypt(account.secretAccessKey),
      };
    } else {
      throw new Error("No credentials configured for this account");
    }

    const clientConfig = { region: account.region, credentials };

    // ── Sync IAM Users ───────────────────────────────────────────────────
    const iam = new IAMClient(clientConfig);
    const iamUsers = await iam.send(new ListUsersCommand({ MaxItems: 1000 }));

    // Snapshot existing usernames so we can detect what's newly added.
    const existingUsers = await prisma.iAMAudit.findMany({
      where: { awsAccountId: account.accountId, isRoot: false },
      select: { username: true },
    });
    const existingUsernames = new Set(existingUsers.map((u) => u.username));

    const syncedUsernames: string[] = [];
    const addedUsernames: string[] = [];
    for (const u of iamUsers.Users ?? []) {
      syncedUsernames.push(u.UserName!);
      if (!existingUsernames.has(u.UserName!)) addedUsernames.push(u.UserName!);
      await prisma.iAMAudit.upsert({
        where: {
          awsAccountId_username: { awsAccountId: account.accountId, username: u.UserName! },
        },
        update: { arn: u.Arn, passwordLastUsed: u.PasswordLastUsed, snapshotAt: new Date() },
        create: {
          awsAccountId: account.accountId,
          username: u.UserName!,
          arn: u.Arn,
          isRoot: false,
          mfaEnabled: false,
          riskLevel: "LOW",
        },
      });
    }

    // Find users that will be pruned (capture names BEFORE deleting for the log).
    const usersToRemove = await prisma.iAMAudit.findMany({
      where: {
        awsAccountId: account.accountId,
        isRoot: false,
        username: { notIn: syncedUsernames },
      },
      select: { username: true },
    });
    const removedUsernames = usersToRemove.map((u) => u.username);

    if (removedUsernames.length > 0) {
      await prisma.iAMAudit.deleteMany({
        where: {
          awsAccountId: account.accountId,
          isRoot: false,
          username: { notIn: syncedUsernames },
        },
      });
    }

    // ── Sync RDS Instances ───────────────────────────────────────────────
    const rds = new RDSClient(clientConfig);
    const [instances, clusters] = await Promise.all([
      rds.send(new DescribeDBInstancesCommand({})),
      rds.send(new DescribeDBClustersCommand({})),
    ]);

    const existingDbs = await prisma.databaseAudit.findMany({
      where: { awsAccountId: account.accountId },
      select: { dbIdentifier: true },
    });
    const existingDbIds = new Set(existingDbs.map((d) => d.dbIdentifier));

    const syncedDbIdentifiers: string[] = [];
    const addedDbIdentifiers: string[] = [];
    for (const db of instances.DBInstances ?? []) {
      syncedDbIdentifiers.push(db.DBInstanceIdentifier!);
      if (!existingDbIds.has(db.DBInstanceIdentifier!)) {
        addedDbIdentifiers.push(db.DBInstanceIdentifier!);
      }
      const riskLevel = evaluateDbRisk(
        db.PubliclyAccessible ?? false,
        db.StorageEncrypted ?? false,
        db.BackupRetentionPeriod ?? 0
      );

      await prisma.databaseAudit.upsert({
        where: {
          awsAccountId_dbIdentifier: {
            awsAccountId: account.accountId,
            dbIdentifier: db.DBInstanceIdentifier!,
          },
        },
        update: {
          status: db.DBInstanceStatus ?? "unknown",
          engineVersion: db.EngineVersion,
          storageEncrypted: db.StorageEncrypted ?? false,
          publiclyAccessible: db.PubliclyAccessible ?? false,
          backupRetentionPeriod: db.BackupRetentionPeriod ?? 0,
          multiAz: db.MultiAZ ?? false,
          iamDatabaseAuthEnabled: db.IAMDatabaseAuthenticationEnabled ?? false,
          deletionProtection: db.DeletionProtection ?? false,
          allocatedStorage: db.AllocatedStorage,
          riskLevel,
          snapshotAt: new Date(),
        },
        create: {
          awsAccountId: account.accountId,
          dbIdentifier: db.DBInstanceIdentifier!,
          dbName: db.DBName,
          engine: db.Engine ?? "unknown",
          engineVersion: db.EngineVersion,
          status: db.DBInstanceStatus ?? "unknown",
          instanceClass: db.DBInstanceClass,
          multiAz: db.MultiAZ ?? false,
          storageEncrypted: db.StorageEncrypted ?? false,
          publiclyAccessible: db.PubliclyAccessible ?? false,
          iamDatabaseAuthEnabled: db.IAMDatabaseAuthenticationEnabled ?? false,
          deletionProtection: db.DeletionProtection ?? false,
          backupRetentionPeriod: db.BackupRetentionPeriod ?? 0,
          allocatedStorage: db.AllocatedStorage,
          port: db.Endpoint?.Port,
          endpoint: db.Endpoint?.Address,
          availabilityZone: db.AvailabilityZone,
          clusterIdentifier: db.DBClusterIdentifier,
          riskLevel,
        },
      });
    }

    const dbsToRemove = await prisma.databaseAudit.findMany({
      where: {
        awsAccountId: account.accountId,
        dbIdentifier: { notIn: syncedDbIdentifiers },
      },
      select: { dbIdentifier: true },
    });
    const removedDbIdentifiers = dbsToRemove.map((d) => d.dbIdentifier);

    if (removedDbIdentifiers.length > 0) {
      await prisma.databaseAudit.deleteMany({
        where: {
          awsAccountId: account.accountId,
          dbIdentifier: { notIn: syncedDbIdentifiers },
        },
      });
    }

    // ── Write the audit trail ─────────────────────────────────────────────
    await writeSyncAuditLogs({
      account,
      triggeredBy,
      addedUsernames,
      removedUsernames,
      addedDbIdentifiers,
      removedDbIdentifiers,
    });

    // ── Mark sync complete ────────────────────────────────────────────────
    await prisma.awsAccount.update({
      where: { id: account.id },
      data: { status: "ACTIVE", lastSyncAt: new Date(), lastSyncError: null },
    });

    return {
      accountId: account.accountId,
      accountName: account.accountName,
      iamUsersSynced: iamUsers.Users?.length ?? 0,
      iamUsersAdded: addedUsernames.length,
      iamUsersRemoved: removedUsernames.length,
      dbInstancesSynced: instances.DBInstances?.length ?? 0,
      dbInstancesAdded: addedDbIdentifiers.length,
      dbInstancesRemoved: removedDbIdentifiers.length,
      clustersSynced: clusters.DBClusters?.length ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await prisma.awsAccount
      .update({ where: { id: account.id }, data: { status: "ERROR", lastSyncError: message } })
      .catch(() => {});
    await prisma.auditLog
      .create({
        data: {
          userId: triggeredBy === "cron" || triggeredBy === "auto" ? null : triggeredBy,
          action: AUDIT_ACTIONS.SYNC_FAILED,
          resource: "AwsAccount",
          resourceId: account.accountId,
          metadata: { accountName: account.accountName, error: message, triggeredBy },
        },
      })
      .catch(() => {});
    throw error;
  }
}

async function writeSyncAuditLogs(args: {
  account: AwsAccount;
  triggeredBy: string;
  addedUsernames: string[];
  removedUsernames: string[];
  addedDbIdentifiers: string[];
  removedDbIdentifiers: string[];
}) {
  const {
    account,
    triggeredBy,
    addedUsernames,
    removedUsernames,
    addedDbIdentifiers,
    removedDbIdentifiers,
  } = args;

  // System-initiated syncs (cron/auto) have no real user id.
  const userId = triggeredBy === "cron" || triggeredBy === "auto" ? null : triggeredBy;
  const base = { userId, resource: "AwsAccount" as const };

  const rows = [
    ...addedUsernames.map((username) => ({
      ...base,
      action: AUDIT_ACTIONS.IAM_USER_ADDED,
      resourceId: account.accountId,
      metadata: { username, accountName: account.accountName, triggeredBy },
    })),
    ...removedUsernames.map((username) => ({
      ...base,
      action: AUDIT_ACTIONS.IAM_USER_REMOVED,
      resourceId: account.accountId,
      metadata: { username, accountName: account.accountName, triggeredBy },
    })),
    ...addedDbIdentifiers.map((dbIdentifier) => ({
      ...base,
      action: AUDIT_ACTIONS.DB_ADDED,
      resourceId: account.accountId,
      metadata: { dbIdentifier, accountName: account.accountName, triggeredBy },
    })),
    ...removedDbIdentifiers.map((dbIdentifier) => ({
      ...base,
      action: AUDIT_ACTIONS.DB_REMOVED,
      resourceId: account.accountId,
      metadata: { dbIdentifier, accountName: account.accountName, triggeredBy },
    })),
  ];

  if (rows.length > 0) {
    await prisma.auditLog.createMany({ data: rows });
  }
}

/**
 * Sync every active account whose data is stale (older than its configured
 * syncIntervalMin, or never synced). Returns the per-account results.
 * Used by the cron job and the client staleness trigger.
 */
export async function syncStaleAccounts(triggeredBy: string): Promise<SyncResult[]> {
  const accounts = await prisma.awsAccount.findMany({ where: { isActive: true } });
  const now = Date.now();

  const due = accounts.filter((a) => {
    if (!a.lastSyncAt) return true;
    const ageMin = (now - a.lastSyncAt.getTime()) / 60_000;
    return ageMin >= (a.syncIntervalMin ?? 60);
  });

  const results: SyncResult[] = [];
  for (const account of due) {
    try {
      results.push(await syncAwsAccount(account, triggeredBy));
    } catch (err) {
      console.error(`[syncStaleAccounts] ${account.accountName} failed:`, err);
    }
  }
  return results;
}
