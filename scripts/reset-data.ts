// scripts/reset-data.ts
// Wipes ALL audit/security data — keeps users only.
// Run: npx tsx scripts/reset-data.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("🗑️  Resetting all data...\n");

  // Delete in dependency order — child tables first
  const recs    = await prisma.recommendation.deleteMany({});
  const dbAct   = await prisma.databaseActivity.deleteMany({});
  const dbAudit = await prisma.databaseAudit.deleteMany({});
  const iam     = await prisma.iAMAudit.deleteMany({});
  const logins  = await prisma.loginAudit.deleteMany({});
  const dbs     = await prisma.monitoredDatabase.deleteMany({});
  const accounts = await prisma.awsAccount.deleteMany({});

  console.log(`✅ Deleted ${recs.count} recommendations`);
  console.log(`✅ Deleted ${dbAct.count} database activity records`);
  console.log(`✅ Deleted ${dbAudit.count} database audit records`);
  console.log(`✅ Deleted ${iam.count} IAM audit records`);
  console.log(`✅ Deleted ${logins.count} login audit records`);
  console.log(`✅ Deleted ${dbs.count} monitored databases`);
  console.log(`✅ Deleted ${accounts.count} AWS accounts`);
  console.log("\n✅ All data wiped. Users preserved.");
  console.log("   Run npm run db:seed to reload demo data.");
}

main()
  .catch((e) => { console.error("❌ Reset failed:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
