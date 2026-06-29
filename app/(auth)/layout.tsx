// app/(auth)/layout.tsx
// Minimal layout for auth pages — no sidebar, no nav.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
