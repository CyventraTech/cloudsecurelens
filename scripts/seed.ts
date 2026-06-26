// scripts/seed.ts
// Database seed script — creates initial admin user and demo data.
// Run with: npx tsx scripts/seed.ts

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Inline password hash to avoid import issues in script context
async function hashPassword(password: string): Promise<string> {
  const ITERATIONS = 310_000;
  const KEY_LENGTH = 64;
  const ALGORITHM = "sha512";
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `${ITERATIONS}:${ALGORITHM}:${salt}:${hash.toString("hex")}`;
}

async function main() {
  console.log("🌱 Seeding Cloud SecureLens database...");

  // --- Admin User ---
  const adminPassword = await hashPassword("Admin@SecureLens2024");
  const admin = await prisma.user.upsert({
    where: { email: "admin@cloudsecurelens.io" },
    update: {},
    create: {
      email: "admin@cloudsecurelens.io",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // --- Demo Analyst ---
  const analystPassword = await hashPassword("Analyst@SecureLens2024");
  const analyst = await prisma.user.upsert({
    where: { email: "analyst@cloudsecurelens.io" },
    update: {},
    create: {
      email: "analyst@cloudsecurelens.io",
      name: "Security Analyst",
      password: analystPassword,
      role: "ANALYST",
    },
  });
  console.log(`✅ Analyst user: ${analyst.email}`);

  // --- Sample Login Audits ---
  const now = new Date();
  const loginEvents = [
    {
      eventId: crypto.randomUUID(),
      eventType: "CONSOLE_LOGIN" as const,
      eventTime: new Date(now.getTime() - 1000 * 60 * 5),
      username: "alice@example.com",
      sourceIp: "203.0.113.42",
      region: "us-east-1",
      mfaUsed: true,
      loginResult: "SUCCESS" as const,
      awsAccountId: "123456789012",
    },
    {
      eventId: crypto.randomUUID(),
      eventType: "FAILED_LOGIN" as const,
      eventTime: new Date(now.getTime() - 1000 * 60 * 15),
      username: "bob@example.com",
      sourceIp: "198.51.100.7",
      region: "us-west-2",
      mfaUsed: false,
      loginResult: "FAILURE" as const,
      errorCode: "NotAuthorized",
      errorMessage: "Failed authentication",
      awsAccountId: "123456789012",
    },
    {
      eventId: crypto.randomUUID(),
      eventType: "ROOT_LOGIN" as const,
      eventTime: new Date(now.getTime() - 1000 * 60 * 60 * 2),
      username: "root",
      sourceIp: "10.0.0.1",
      region: "us-east-1",
      mfaUsed: false,
      loginResult: "SUCCESS" as const,
      awsAccountId: "123456789012",
    },
    ...Array.from({ length: 20 }, (_, i) => ({
      eventId: crypto.randomUUID(),
      eventType: i % 3 === 0 ? ("FAILED_LOGIN" as const) : ("CONSOLE_LOGIN" as const),
      eventTime: new Date(now.getTime() - 1000 * 60 * 60 * (i + 1)),
      username: `user${i + 1}@example.com`,
      sourceIp: `203.0.113.${i + 10}`,
      region: i % 2 === 0 ? "us-east-1" : "eu-west-1",
      mfaUsed: i % 2 === 0,
      loginResult: i % 3 === 0 ? ("FAILURE" as const) : ("SUCCESS" as const),
      awsAccountId: "123456789012",
    })),
  ];

  for (const event of loginEvents) {
    await prisma.loginAudit.upsert({
      where: { eventId: event.eventId },
      update: {},
      create: event,
    });
  }
  console.log(`✅ Seeded ${loginEvents.length} login audit records`);

  // --- Sample IAM Audit ---
  const iamUsers = [
    {
      username: "alice",
      arn: "arn:aws:iam::123456789012:user/alice",
      accountId: "123456789012",
      mfaEnabled: true,
      isRoot: false,
      passwordEnabled: true,
      accessKey1Active: true,
      accessKey1LastRotated: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30),
      isActive: true,
      riskLevel: "LOW" as const,
    },
    {
      username: "bob",
      arn: "arn:aws:iam::123456789012:user/bob",
      accountId: "123456789012",
      mfaEnabled: false,
      isRoot: false,
      passwordEnabled: true,
      accessKey1Active: true,
      accessKey1LastRotated: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 120),
      isActive: true,
      riskLevel: "HIGH" as const,
    },
    {
      username: "root",
      arn: "arn:aws:iam::123456789012:root",
      accountId: "123456789012",
      mfaEnabled: false,
      isRoot: true,
      passwordEnabled: true,
      isActive: true,
      riskLevel: "CRITICAL" as const,
    },
    {
      username: "carol",
      arn: "arn:aws:iam::123456789012:user/carol",
      accountId: "123456789012",
      mfaEnabled: true,
      isRoot: false,
      passwordEnabled: false,
      accessKey1Active: false,
      isActive: false,
      riskLevel: "MEDIUM" as const,
    },
  ];

  for (const iamUser of iamUsers) {
    await prisma.iAMAudit.upsert({
      where: { id: iamUser.username },
      update: iamUser,
      create: { id: iamUser.username, ...iamUser },
    });
  }
  console.log(`✅ Seeded ${iamUsers.length} IAM audit records`);

  // --- Sample Database Audit ---
  const databases = [
    {
      dbIdentifier: "prod-aurora-cluster",
      dbName: "production",
      engine: "aurora-postgresql",
      engineVersion: "15.4",
      status: "available",
      instanceClass: "db.r6g.large",
      multiAz: true,
      storageEncrypted: true,
      publiclyAccessible: false,
      iamDatabaseAuthEnabled: true,
      deletionProtection: true,
      backupRetentionPeriod: 7,
      allocatedStorage: 100,
      port: 5432,
      availabilityZone: "us-east-1a",
      riskLevel: "LOW" as const,
    },
    {
      dbIdentifier: "dev-aurora-cluster",
      dbName: "development",
      engine: "aurora-postgresql",
      engineVersion: "15.4",
      status: "available",
      instanceClass: "db.t3.medium",
      multiAz: false,
      storageEncrypted: false,
      publiclyAccessible: true,
      iamDatabaseAuthEnabled: false,
      deletionProtection: false,
      backupRetentionPeriod: 1,
      allocatedStorage: 20,
      port: 5432,
      availabilityZone: "us-east-1b",
      riskLevel: "CRITICAL" as const,
    },
  ];

  for (const db of databases) {
    await prisma.databaseAudit.upsert({
      where: { dbIdentifier: db.dbIdentifier },
      update: db,
      create: db,
    });
  }
  console.log(`✅ Seeded ${databases.length} database audit records`);

  // --- Sample Database Activity ---
  const queryTypes = [
    "SELECT", "INSERT", "UPDATE", "DELETE",
    "CREATE_TABLE", "DROP_TABLE", "FAILED",
  ] as const;

  const activities = Array.from({ length: 50 }, (_, i) => ({
    dbIdentifier: i % 2 === 0 ? "prod-aurora-cluster" : "dev-aurora-cluster",
    queryType: queryTypes[i % queryTypes.length],
    username: `app_user_${(i % 4) + 1}`,
    databaseName: i % 2 === 0 ? "production" : "development",
    queryText: `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    rowsAffected: Math.floor(Math.random() * 100),
    durationMs: Math.random() * 500,
    success: i % 7 !== 0,
    recordedAt: new Date(now.getTime() - 1000 * 60 * i),
  }));

  await prisma.databaseActivity.createMany({ data: activities });
  console.log(`✅ Seeded ${activities.length} database activity records`);

  // --- Sample Recommendations ---
  const recommendations = [
    {
      title: "Enable MFA for IAM User: bob",
      description:
        "IAM user 'bob' does not have Multi-Factor Authentication enabled. This increases the risk of unauthorized access if credentials are compromised.",
      severity: "HIGH" as const,
      category: "MFA" as const,
      resource: "arn:aws:iam::123456789012:user/bob",
      resourceType: "IAM User",
      status: "OPEN" as const,
      remediation:
        "Navigate to IAM > Users > bob > Security credentials > Assign MFA device.",
      awsDocUrl: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html",
    },
    {
      title: "Disable Root Account Console Access",
      description:
        "The root account was used to log in recently. Root access should never be used for day-to-day operations and MFA should be enabled.",
      severity: "CRITICAL" as const,
      category: "ROOT_ACCOUNT" as const,
      resource: "arn:aws:iam::123456789012:root",
      resourceType: "Root Account",
      status: "OPEN" as const,
      remediation:
        "Enable MFA on root account, delete root access keys, and use IAM users/roles instead.",
      awsDocUrl: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html",
    },
    {
      title: "Rotate Access Key for IAM User: bob",
      description:
        "Access key for 'bob' was last rotated more than 90 days ago. Stale credentials increase the blast radius of a potential compromise.",
      severity: "HIGH" as const,
      category: "ACCESS_KEY" as const,
      resource: "arn:aws:iam::123456789012:user/bob",
      resourceType: "IAM Access Key",
      status: "OPEN" as const,
      remediation:
        "Create a new access key, update all applications using the old key, then deactivate and delete the old key.",
    },
    {
      title: "Disable Public Accessibility for dev-aurora-cluster",
      description:
        "The Aurora cluster 'dev-aurora-cluster' is publicly accessible. Database instances should not be directly reachable from the public internet.",
      severity: "CRITICAL" as const,
      category: "NETWORK" as const,
      resource: "dev-aurora-cluster",
      resourceType: "Aurora Cluster",
      status: "OPEN" as const,
      remediation:
        "Modify the RDS instance to set PubliclyAccessible to false, and ensure access is only via VPC.",
    },
    {
      title: "Enable Storage Encryption for dev-aurora-cluster",
      description:
        "The Aurora cluster 'dev-aurora-cluster' does not have storage encryption enabled. Encryption at rest protects data if physical storage is compromised.",
      severity: "HIGH" as const,
      category: "ENCRYPTION" as const,
      resource: "dev-aurora-cluster",
      resourceType: "Aurora Cluster",
      status: "OPEN" as const,
      remediation:
        "Snapshot the cluster, restore it with encryption enabled, then update connection strings.",
    },
    {
      title: "Enable Automated Backups for dev-aurora-cluster",
      description:
        "The backup retention period for 'dev-aurora-cluster' is set to 1 day. Increase to at least 7 days to ensure data recovery capability.",
      severity: "MEDIUM" as const,
      category: "BACKUP" as const,
      resource: "dev-aurora-cluster",
      resourceType: "Aurora Cluster",
      status: "OPEN" as const,
      remediation:
        "Modify the RDS cluster to set the backup retention period to at least 7 days.",
    },
    {
      title: "Remove Inactive IAM User: carol",
      description:
        "IAM user 'carol' has not been active recently. Inactive accounts should be disabled or removed to reduce the attack surface.",
      severity: "MEDIUM" as const,
      category: "IAM" as const,
      resource: "arn:aws:iam::123456789012:user/carol",
      resourceType: "IAM User",
      status: "OPEN" as const,
      remediation:
        "Disable the IAM user's console access and deactivate any access keys. If no longer needed, delete the user.",
    },
  ];

  await prisma.recommendation.createMany({ data: recommendations });
  console.log(`✅ Seeded ${recommendations.length} recommendations`);

  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Demo credentials:");
  console.log("  Admin:   admin@cloudsecurelens.io / Admin@SecureLens2024");
  console.log("  Analyst: analyst@cloudsecurelens.io / Analyst@SecureLens2024");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
