// scripts/create-db.ts
// Creates the cloud_secure_lens database if it doesn't exist.
// Connects to the default 'postgres' DB first, then creates ours.

import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  // Parse the URL to get connection details, but connect to 'postgres' DB
  const parsed = new URL(url);
  const targetDb = parsed.pathname.replace("/", ""); // cloud_secure_lens

  console.log(`🔍 Connecting to RDS at ${parsed.hostname}...`);

  // Connect to default postgres DB first
  const client = new Client({
    host:     parsed.hostname,
    port:     parseInt(parsed.port || "5432"),
    user:     parsed.username,
    password: decodeURIComponent(parsed.password),
    database: "postgres",
    ssl:      { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected to RDS successfully");

    // Check if DB already exists
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );

    if (res.rowCount && res.rowCount > 0) {
      console.log(`✅ Database '${targetDb}' already exists`);
    } else {
      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✅ Database '${targetDb}' created successfully`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
