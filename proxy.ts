// proxy.ts  (Next.js 16: proxy replaces middleware)
// Route protection — runs in the Edge runtime.
// Exported function must be named "proxy" in Next.js 16.

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookies } from "@/lib/auth/cookie-config";

// Edge-safe config: no Prisma, no Node.js crypto.
// IMPORTANT: must use the SAME cookie config as lib/auth/config.ts, otherwise
// this middleware reads the session from a different cookie name than the one
// written at login and would bounce authenticated users back to /login.
const edgeConfig: NextAuthConfig = {
  providers: [],
  pages: { signIn: "/login" },
  trustHost: true,
  ...(authCookies ? { cookies: authCookies } : {}),
};

const { auth } = NextAuth(edgeConfig);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public static assets (e.g. /images/logo.png) — never gate behind auth.
  // These live at the root path, so the matcher's "public" exclusion misses
  // them; without this they'd be redirected to /login and fail to load.
  if (pathname.startsWith("/images/") || /\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Cron endpoints authenticate via CRON_SECRET inside the route handler, not
  // via a user session. Let them through so Vercel Cron (which sends no session
  // cookie) isn't bounced to /login.
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const session = await auth();

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
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
