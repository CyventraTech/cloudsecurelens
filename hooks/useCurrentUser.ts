"use client";

// hooks/useCurrentUser.ts
// Returns the current authenticated user from the NextAuth session.

import { useSession } from "next-auth/react";

export interface CurrentUser {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  role: string;
}

export function useCurrentUser(): CurrentUser | null {
  const { data: session, status } = useSession();

  if (status !== "authenticated" || !session?.user) return null;

  return {
    id: (session.user as { id?: string }).id ?? "",
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: (session.user as { role?: string }).role ?? "VIEWER",
  };
}

export function useSessionStatus() {
  const { status } = useSession();
  return status;
}
