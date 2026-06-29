// app/api/users/route.ts
// GET  /api/users  — list all application users (admin only)
// POST /api/users  — create a new application user (admin only)

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]).default("VIEWER"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(apiError("Unauthorized"), { status: 401 });
  }

  const currentUser = session.user as { role?: string };
  if (currentUser.role !== "ADMIN") {
    return NextResponse.json(
      apiError("Only admins can view users"),
      { status: 403 }
    );
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        // Never expose the password hash
        password: false,
      },
    });

    return NextResponse.json(apiSuccess(users));
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json(apiError("Failed to load users"), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(apiError("Unauthorized"), { status: 401 });
  }

  const currentUser = session.user as { role?: string };
  if (currentUser.role !== "ADMIN") {
    return NextResponse.json(
      apiError("Only admins can create users"),
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.issues.map((i) => i.message).join("; ")),
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        apiError(`A user with email ${normalizedEmail} already exists`),
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: await hashPassword(password),
        role,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      apiSuccess(user, "User created successfully"),
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/users]", error);
    return NextResponse.json(apiError("Failed to create user"), { status: 500 });
  }
}
