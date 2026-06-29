// lib/auth/cookie-config.ts
// Shared NextAuth cookie configuration.
//
// This file MUST stay edge-safe (no Node.js / Prisma imports) because it is
// imported by both the Node runtime auth config (lib/auth/config.ts) and the
// Edge runtime route-protection middleware (proxy.ts). Both NextAuth instances
// must use the SAME cookie names, otherwise the session cookie written at login
// cannot be read by the middleware and the user is bounced back to /login.
//
// Why we override the defaults outside production:
// The v0 preview serves the app inside a cross-site iframe. Browsers will not
// send NextAuth's default `SameSite=Lax` cookies in a cross-site iframe, so the
// CSRF/session cookies never arrive and sign-in fails. Setting
// `SameSite=None; Secure` allows the cookies to travel inside the iframe.
// In production we return `undefined` so NextAuth keeps its hardened defaults
// (`__Secure-`/`__Host-` prefixed, `SameSite=Lax`).

import type { NextAuthConfig } from "next-auth";

const isProduction = process.env.VERCEL_ENV === "production";

type AuthCookies = NonNullable<NextAuthConfig["cookies"]>;

export const authCookies: AuthCookies | undefined = isProduction
  ? undefined
  : {
      sessionToken: {
        name: "authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "none",
          path: "/",
          secure: true,
        },
      },
      callbackUrl: {
        name: "authjs.callback-url",
        options: {
          httpOnly: true,
          sameSite: "none",
          path: "/",
          secure: true,
        },
      },
      csrfToken: {
        name: "authjs.csrf-token",
        options: {
          httpOnly: true,
          sameSite: "none",
          path: "/",
          secure: true,
        },
      },
    };
