// scripts/seed.ts
// Seeds demo users, one AWS account, and sample security data.
// Run: npm run db:seed

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  const ITERATIONS = 310_000;
  const KEY_LENGTH = 64;
  const ALGORITHM = "sha512";
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM, (err, key) => {
      if (err) reject(err); else resolve(key);
    });
  });
  return `${ITERATIONS}:${ALGORITHM}:${salt}:${hash.toString("hex")}`;
}

const DEMO_ACCOUNT_ID = "123456789012";

async function main() {
  console.log("🌱 Seeding Cloud SecureLens...\n");

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@cloudsecurelens.io" },
    update: {},
    create: {
      email: "admin@cloudsecurelens.io",
      name: "Admin User",
      password: await hashPassword("Admin@SecureLens2024"),
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin:   ${admin.email}`);

  const analyst = await prisma.user.upsert({
    where: { email: "analyst@cloudsecurelens.io" },
    update: {},
    create: {
      email: "analyst@cloudsecurelens.io",
      name: "Security Analyst",
      password: await hashPassword("Analyst@SecureLens2024"),
      role: "ANALYST",
    },
  });
  console.log(`✅ Analyst: ${analyst.email}`);

  // ── AWS Account ────────────────────────────────────────────────────────────
  const awsAccount = await prisma.awsAccount.upsert({
    where: { accountId: DEMO_ACCOUNT_ID },
    update: { status: "ACTIVE", lastSyncAt: new Date() },
    create: {
      accountId:   DEMO_ACCOUNT_ID,
      accountName: "Production Account",
      environment: "PRODUCTION",
      region:      "us-east-1",
      roleArn:     `arn:aws:iam::${DEMO_ACCOUNT_ID}:role/CloudSecureLensRole`,
      externalId:  "cloud-secure-lens-demo",
      status:      "ACTIVE",
      lastSyncAt:  new Date(),
    },
  });
  console.log(`✅ AWS Account: ${awsAccount.accountName} (${awsAccount.accountId})`);

  // Clear existing seed data for this account
  await prisma.loginAudit.deleteMany({ where: { awsAccountId: DEMO_ACCOUNT_ID } });
  await prisma.iAMAudit.deleteMany({ where: { awsAccountId: DEMO_ACCOUNT_ID } });
  await prisma.databaseAudit.deleteMany({ where: { awsAccountId: DEMO_ACCOUNT_ID } });
  await prisma.databaseActivity.deleteMany({ where: { awsAccountId: DEMO_ACCOUNT_ID } });
  await prisma.recommendation.deleteMany({ where: { awsAccountId: DEMO_ACCOUNT_ID } });
  console.log("🗑️  Cleared previous seed data");

  // ── Login Audits ───────────────────────────────────────────────────────────
  const now = new Date();
  const loginEvents = [
    {
      eventId: crypto.randomUUID(),
      awsAccountId: DEMO_ACCOUNT_ID,
      eventType: "CONSOLE_LOGIN" as const,
      eventTime: new Date(now.getTime() - 5 * 60_000),
      username: "alice@example.com",
      sourceIp: "203.0.113.42",
      region: "us-east-1",
      mfaUsed: true,
      loginResult: "SUCCESS" as const,
    },
    {
      eventId: crypto.randomUUID(),
      awsAccountId: DEMO_ACCOUNT_ID,
      eventType: "FAILED_LOGIN" as const,
      eventTime: new Date(now.getTime() - 15 * 60_000),
      username: "bob@example.com",
      sourceIp: "198.51.100.7",
      region: "us-west-2",
      mfaUsed: false,
      loginResult: "FAILURE" as const,
      errorCode: "NotAuthorized",
      errorMessage: "Failed authentication",
    },
    {
      eventId: crypto.randomUUID(),
      awsAccountId: DEMO_ACCOUNT_ID,
      eventType: "ROOT_LOGIN" as const,
      eventTime: new Date(now.getTime() - 2 * 3_600_000),
      username: "root",
      sourceIp: "10.0.0.1",
      region: "us-east-1",
      mfaUsed: false,
      loginResult: "SUCCESS" as const,
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      eventId: crypto.randomUUID(),
      awsAccountId: DEMO_ACCOUNT_ID,
      eventType: i % 3 === 0 ? ("FAILED_LOGIN" as const) : ("CONSOLE_LOGIN" as const),
      eventTime: new Date(now.getTime() - (i + 1) * 3_600_000),
      username: `user${i + 1}@example.com`,
      sourceIp: `203.0.113.${i + 10}`,
      region: i % 2 === 0 ? "us-east-1" : "eu-west-1",
      mfaUsed: i % 2 === 0,
      loginResult: i % 3 === 0 ? ("FAILURE" as const) : ("SUCCESS" as const),
    })),
  ];
  await prisma.loginAudit.createMany({ data: loginEvents });
  console.log(`✅ ${loginEvents.length} login audit records`);

  // ── IAM Audit ──────────────────────────────────────────────────────────────
  await prisma.iAMAudit.createMany({
    data: [
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        username: "alice",
        arn: `arn:aws:iam::${DEMO_ACCOUNT_ID}:user/alice`,
        mfaEnabled: true, isRoot: false, passwordEnabled: true,
        accessKey1Active: true,
        accessKey1LastRotated: new Date(now.getTime() - 30 * 86_400_000),
        isActive: true, riskLevel: "LOW",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        username: "bob",
        arn: `arn:aws:iam::${DEMO_ACCOUNT_ID}:user/bob`,
        mfaEnabled: false, isRoot: false, passwordEnabled: true,
        accessKey1Active: true,
        accessKey1LastRotated: new Date(now.getTime() - 120 * 86_400_000),
        isActive: true, riskLevel: "HIGH",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        username: "root",
        arn: `arn:aws:iam::${DEMO_ACCOUNT_ID}:root`,
        mfaEnabled: false, isRoot: true, passwordEnabled: true,
        isActive: true, riskLevel: "CRITICAL",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        username: "carol",
        arn: `arn:aws:iam::${DEMO_ACCOUNT_ID}:user/carol`,
        mfaEnabled: true, isRoot: false, passwordEnabled: false,
        accessKey1Active: false, isActive: false, riskLevel: "MEDIUM",
      },
    ],
  });
  console.log("✅ 4 IAM audit records");

  // ── Database Audit ─────────────────────────────────────────────────────────
  await prisma.databaseAudit.createMany({
    data: [
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        dbIdentifier: "prod-aurora-cluster",
        dbName: "production",
        engine: "aurora-postgresql", engineVersion: "15.4",
        status: "available", instanceClass: "db.r6g.large",
        multiAz: true, storageEncrypted: true, publiclyAccessible: false,
        iamDatabaseAuthEnabled: true, deletionProtection: true,
        backupRetentionPeriod: 7, allocatedStorage: 100,
        port: 5432, availabilityZone: "us-east-1a",
        riskLevel: "LOW",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        dbIdentifier: "dev-aurora-cluster",
        dbName: "development",
        engine: "aurora-postgresql", engineVersion: "15.4",
        status: "available", instanceClass: "db.t3.medium",
        multiAz: false, storageEncrypted: false, publiclyAccessible: true,
        iamDatabaseAuthEnabled: false, deletionProtection: false,
        backupRetentionPeriod: 1, allocatedStorage: 20,
        port: 5432, availabilityZone: "us-east-1b",
        riskLevel: "CRITICAL",
      },
    ],
  });
  console.log("✅ 2 database audit records");

  // ── Database Activity ──────────────────────────────────────────────────────
  const queryTypes = ["SELECT","INSERT","UPDATE","DELETE","CREATE_TABLE","DROP_TABLE","FAILED"] as const;
  await prisma.databaseActivity.createMany({
    data: Array.from({ length: 50 }, (_, i) => ({
      awsAccountId: DEMO_ACCOUNT_ID,
      dbIdentifier: i % 2 === 0 ? "prod-aurora-cluster" : "dev-aurora-cluster",
      queryType: queryTypes[i % queryTypes.length],
      username: `app_user_${(i % 4) + 1}`,
      databaseName: i % 2 === 0 ? "production" : "development",
      queryText: "SELECT * FROM users WHERE id = $1 LIMIT 1",
      rowsAffected: Math.floor(Math.random() * 100),
      durationMs: Math.random() * 500,
      success: i % 7 !== 0,
      recordedAt: new Date(now.getTime() - i * 60_000),
    })),
  });
  console.log("✅ 50 database activity records");

  // ── Recommendations ────────────────────────────────────────────────────────
  await prisma.recommendation.createMany({
    data: [
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        title: "Enable MFA for IAM User: bob",
        description: "IAM user 'bob' does not have MFA enabled.",
        severity: "HIGH", category: "MFA", status: "OPEN",
        resource: `arn:aws:iam::${DEMO_ACCOUNT_ID}:user/bob`,
        resourceType: "IAM User",
        remediation: "IAM > Users > bob > Security credentials > Assign MFA device.",
        awsDocUrl: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        title: "Disable Root Account Console Access",
        description: "Root account was used recently. Never use root for day-to-day operations.",
        severity: "CRITICAL", category: "ROOT_ACCOUNT", status: "OPEN",
        resource: `arn:aws:iam::${DEMO_ACCOUNT_ID}:root`,
        resourceType: "Root Account",
        remediation: "Enable MFA on root, delete root access keys, use IAM roles instead.",
        awsDocUrl: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        title: "Rotate Access Key for IAM User: bob",
        description: "Access key for 'bob' last rotated 120+ days ago.",
        severity: "HIGH", category: "ACCESS_KEY", status: "OPEN",
        resource: `arn:aws:iam::${DEMO_ACCOUNT_ID}:user/bob`,
        resourceType: "IAM Access Key",
        remediation: "Create a new key, update apps, then deactivate the old key.",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        title: "Disable Public Access for dev-aurora-cluster",
        description: "'dev-aurora-cluster' is publicly accessible from the internet.",
        severity: "CRITICAL", category: "NETWORK", status: "OPEN",
        resource: "dev-aurora-cluster", resourceType: "Aurora Cluster",
        remediation: "Set PubliclyAccessible=false and restrict to VPC only.",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        title: "Enable Storage Encryption for dev-aurora-cluster",
        description: "Storage encryption is not enabled on 'dev-aurora-cluster'.",
        severity: "HIGH", category: "ENCRYPTION", status: "OPEN",
        resource: "dev-aurora-cluster", resourceType: "Aurora Cluster",
        remediation: "Snapshot, restore with encryption enabled, update connection strings.",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        title: "Increase Backup Retention for dev-aurora-cluster",
        description: "Backup retention is 1 day. Increase to 7+ days.",
        severity: "MEDIUM", category: "BACKUP", status: "OPEN",
        resource: "dev-aurora-cluster", resourceType: "Aurora Cluster",
        remediation: "Modify cluster backup retention period to 7+ days.",
      },
      {
        awsAccountId: DEMO_ACCOUNT_ID,
        title: "Remove Inactive IAM User: carol",
        description: "'carol' is inactive. Remove to reduce attack surface.",
        severity: "MEDIUM", category: "IAM", status: "OPEN",
        resource: `arn:aws:iam::${DEMO_ACCOUNT_ID}:user/carol`,
        resourceType: "IAM User",
        remediation: "Disable console access, deactivate keys, delete if no longer needed.",
      },
    ],
  });
  console.log("✅ 7 recommendations");

  console.log("\n🎉 Seeding complete!\n");
  console.log("📋 Demo credentials:");
  console.log("   Admin:   admin@cloudsecurelens.io   / Admin@SecureLens2024");
  console.log("   Analyst: analyst@cloudsecurelens.io / Analyst@SecureLens2024");
}

main()
  .catch((e) => { console.error("\n❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
