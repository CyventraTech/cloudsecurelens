// lib/db/client.ts
// Prisma v7 requires a driver adapter — the connection URL no longer goes in
// the schema file or the PrismaClient constructor directly.
// We use @prisma/adapter-pg (PrismaPg) backed by node-postgres (pg).

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get() {
        throw new Error(
          "DATABASE_URL is not set. Copy .env.example to .env and fill in your database connection string."
        );
      },
      apply() {
        throw new Error(
          "DATABASE_URL is not set. Copy .env.example to .env and fill in your database connection string."
        );
      },
    };
    return new Proxy({}, handler) as unknown as PrismaClient;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pg = require("pg");

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
