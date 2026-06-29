"use client";

// Thin wrapper around NextAuth's SessionProvider so we can use
// useSession() in any Client Component inside the app.

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface Props {
  children: React.ReactNode;
  session?: Session | null;
}

export function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
