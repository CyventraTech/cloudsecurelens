// app/api/auth/[...nextauth]/route.ts
// NextAuth v5 route handler — handles all /api/auth/* requests.

import { handlers } from "@/lib/auth/config";

export const { GET, POST } = handlers;
