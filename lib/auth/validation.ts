// lib/auth/validation.ts
// Zod schemas for authentication input validation.

import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
