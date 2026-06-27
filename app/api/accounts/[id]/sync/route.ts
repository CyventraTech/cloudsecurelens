// app/api/accounts/[id]/sync/route.ts
// POST /api/accounts/:id/sync — trigger an immediate AWS data sync

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { decrypt } from "@/lib/crypto/encrypt";
import {
  STSClient,
  AssumeRoleCommand,
} from "@aws-sdk/client-sts";
import {
  IAMClient,
  ListUsersCommand,
  GetAccountSummaryCommand,
} from "@aws-sdk/client-iam";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
} from "@aws-sdk/client-rds";

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

    // Mark sync in progress
    await prisma.awsAccount.update({
      where: { id },
      data: { status: "PENDING", lastSyncError: null },
    });

    // ── Resolve AWS credentials ────────────────────────────────────────────
    let credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    } | undefined;

    if (account.roleArn) {
      // Cross-account: AssumeRole via STS
      const sts = new STSClient({
        region: account.region,
        credentials: {
          accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const assumed = await sts.send(
        new AssumeRoleCommand({
          RoleArn:         account.roleArn,
          RoleSessionName: "CloudSecureLensSync",
          ExternalId:      account.externalId ?? undefined,
          DurationSeconds: 900,
        })
      );

      if (!assumed.Credentials) throw new Error("STS AssumeRole returned no credentials");

      credentials = {
        accessKeyId:     assumed.Credentials.AccessKeyId!,
        secretAccessKey: assumed.Credentials.SecretAccessKey!,
        sessionToken:    assumed.Credentials.SessionToken,
      };
    } else if (account.accessKeyId && account.secretAccessKey) {
      // Direct credentials (decrypt from DB)
      credentials = {
        accessKeyId:     decrypt(account.accessKeyId),
        secretAccessKey: decrypt(account.secretAccessKey),
      };
    } else {
      throw new Error("No credentials configured for this account");
    }

    const clientConfig = {
      region: account.region,
      credentials,
    };

    // ── Sync IAM Users ─────────────────────────────────────────────────────
    const iam = new IAMClient(clientConfig);
    const iamUsers = await iam.send(new ListUsersCommand({ MaxItems: 1000 }));

    for (const u of iamUsers.Users ?? []) {
      await prisma.iAMAudit.upsert({
        where: { awsAccountId_username: { awsAccountId: account.accountId, username: u.UserName! } },
        update: {
          arn:            u.Arn,
          passwordLastUsed: u.PasswordLastUsed,
          snapshotAt:     new Date(),
        },
        create: {
          awsAccountId: account.accountId,
          username:     u.UserName!,
          arn:          u.Arn,
          isRoot:       false,
          mfaEnabled:   false,  // will be updated by MFA sync
          riskLevel:    "LOW",
        },
      });
    }

    // ── Sync RDS Instances ─────────────────────────────────────────────────
    const rds = new RDSClient(clientConfig);

    const [instances, clusters] = await Promise.all([
      rds.send(new DescribeDBInstancesCommand({})),
      rds.send(new DescribeDBClustersCommand({})),
    ]);

    for (const db of instances.DBInstances ?? []) {
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
          status:                db.DBInstanceStatus ?? "unknown",
          engineVersion:         db.EngineVersion,
          storageEncrypted:      db.StorageEncrypted ?? false,
          publiclyAccessible:    db.PubliclyAccessible ?? false,
          backupRetentionPeriod: db.BackupRetentionPeriod ?? 0,
          multiAz:               db.MultiAZ ?? false,
          iamDatabaseAuthEnabled: db.IAMDatabaseAuthenticationEnabled ?? false,
          deletionProtection:    db.DeletionProtection ?? false,
          allocatedStorage:      db.AllocatedStorage,
          riskLevel,
          snapshotAt:            new Date(),
        },
        create: {
          awsAccountId:          account.accountId,
          dbIdentifier:          db.DBInstanceIdentifier!,
          dbName:                db.DBName,
          engine:                db.Engine ?? "unknown",
          engineVersion:         db.EngineVersion,
          status:                db.DBInstanceStatus ?? "unknown",
          instanceClass:         db.DBInstanceClass,
          multiAz:               db.MultiAZ ?? false,
          storageEncrypted:      db.StorageEncrypted ?? false,
          publiclyAccessible:    db.PubliclyAccessible ?? false,
          iamDatabaseAuthEnabled: db.IAMDatabaseAuthenticationEnabled ?? false,
          deletionProtection:    db.DeletionProtection ?? false,
          backupRetentionPeriod: db.BackupRetentionPeriod ?? 0,
          allocatedStorage:      db.AllocatedStorage,
          port:                  db.Endpoint?.Port,
          endpoint:              db.Endpoint?.Address,
          availabilityZone:      db.AvailabilityZone,
          clusterIdentifier:     db.DBClusterIdentifier,
          riskLevel,
        },
      });
    }

    // ── Mark sync complete ─────────────────────────────────────────────────
    await prisma.awsAccount.update({
      where: { id },
      data: { status: "ACTIVE", lastSyncAt: new Date(), lastSyncError: null },
    });

    return NextResponse.json(
      apiSuccess({
        iamUsersSynced:  iamUsers.Users?.length ?? 0,
        dbInstancesSynced: instances.DBInstances?.length ?? 0,
        clustersSynced:  clusters.DBClusters?.length ?? 0,
      }, "Sync completed successfully")
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    console.error("[POST /api/accounts/:id/sync]", error);

    // Record the error
    await prisma.awsAccount.update({
      where: { id },
      data: { status: "ERROR", lastSyncError: message },
    }).catch(() => {});

    return NextResponse.json(apiError(`Sync failed: ${message}`), { status: 500 });
  }
}

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
