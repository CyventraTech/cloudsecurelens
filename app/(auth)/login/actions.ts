"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/config";
import { loginSchema } from "@/lib/auth/validation";

export type LoginActionResult = { error: string } | { success: true };

/**
 * Server-side login. Runs `signIn` on the server in a single same-origin POST,
 * which sets the session cookie directly on the response. This avoids the
 * client-side `next-auth/react` `signIn` wrapper, whose separate CSRF fetch +
 * POST round-trip fails inside the cross-site v0 preview iframe.
 *
 * `redirect: false` makes `signIn` set the session cookie and return instead of
 * throwing a redirect, so we can surface a clean error or success to the client.
 */
export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  return { success: true };
}
