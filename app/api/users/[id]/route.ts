// app/api/users/[id]/route.ts
// PATCH  /api/users/:id  — update a user's name, role, or password (admin only)
// DELETE /api/users/:id  — delete a user (admin only)

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json(apiError("Unauthorized"), { status: 401 }) };
  }
  const user = session.user as { id?: string; role?: string };
  if (user.role !== "ADMIN") {
    return { error: NextResponse.json(apiError("Only admins can manage users"), { status: 403 }) };
  }
  return { currentUserId: user.id };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        apiError(parsed.error.issues.map((i) => i.message).join("; ")),
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(apiError("User not found"), { status: 404 });
    }

    // Prevent an admin from demoting themselves and removing the last admin.
    if (
      parsed.data.role &&
      parsed.data.role !== "ADMIN" &&
      target.role === "ADMIN"
    ) {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          apiError("Cannot remove the last remaining admin"),
          { status: 400 }
        );
      }
    }

    const data: { name?: string; role?: "ADMIN" | "ANALYST" | "VIEWER"; password?: string } = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.password) data.password = await hashPassword(parsed.data.password);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(apiSuccess(updated, "User updated successfully"));
  } catch (error) {
    console.error("[PATCH /api/users/:id]", error);
    return NextResponse.json(apiError("Failed to update user"), { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    // Don't allow deleting your own account.
    if (id === guard.currentUserId) {
      return NextResponse.json(
        apiError("You cannot delete your own account"),
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(apiError("User not found"), { status: 404 });
    }

    // Don't allow deleting the last admin.
    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          apiError("Cannot delete the last remaining admin"),
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ id }, "User deleted successfully"));
  } catch (error) {
    console.error("[DELETE /api/users/:id]", error);
    return NextResponse.json(apiError("Failed to delete user"), { status: 500 });
  }
}
