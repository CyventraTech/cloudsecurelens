// app/api/logout/route.ts
// Programmatic sign-out endpoint — clears the NextAuth session cookie.

import { signOut } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export async function POST() {
  await signOut({ redirect: false });
  return NextResponse.json({ success: true });
}
