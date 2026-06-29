// lib/auth/config.ts
// NextAuth v5 configuration — credentials provider with Prisma adapter.
// NOTE: This file should only be imported from server-side code (API routes,
// Server Components). Do NOT import this in proxy.ts / edge runtime.

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { comparePassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import { authCookies } from "@/lib/auth/cookie-config";

// In preview/non-production environments the app is served from a dynamic host
// (e.g. *.vusercontent.net) that does not match a hardcoded NEXTAUTH_URL/AUTH_URL.
// When those are set to a different origin, NextAuth's origin validation rejects
// the sign-in POST. Since `trustHost: true` is enabled below, we let NextAuth
// derive the correct origin from the incoming request host instead.
if (process.env.VERCEL_ENV !== "production") {
  delete process.env.NEXTAUTH_URL;
  delete process.env.AUTH_URL;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Shared cookie config — MUST match proxy.ts so the middleware can read the
  // session cookie written at login. See lib/auth/cookie-config.ts.
  ...(authCookies ? { cookies: authCookies } : {}),

  session: {
    strategy: "jwt", // JWT is required for credentials provider
    maxAge: 8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            image: true,
          },
        });

        if (!user || !user.password) return null;

        const isValid = await comparePassword(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  // Trust the host header (required for Vercel deployment)
  trustHost: true,
});
