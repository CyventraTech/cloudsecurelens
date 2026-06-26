// lib/auth/edge.ts
// Edge-runtime-safe auth helper. Uses only the JWT token — no Prisma, no crypto.
// Imported by proxy.ts for route protection.

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

// Minimal config with no Node.js dependencies — safe for Edge runtime
const edgeConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};

export const { auth } = NextAuth(edgeConfig);
