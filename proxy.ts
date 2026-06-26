// proxy.ts  (Next.js 16: proxy replaces middleware)
// Route protection — runs in the Edge runtime.
// Exported function must be named "proxy" in Next.js 16.

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-safe config: no Prisma, no Node.js crypto
const edgeConfig: NextAuthConfig = {
  providers: [],
  pages: { signIn: "/login" },
  trustHost: true,
};

const { auth } = NextAuth(edgeConfig);

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Already on login or auth routes — allow through
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    // If authenticated, redirect away from login
    if (pathname === "/login" && session?.user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // No session — redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
