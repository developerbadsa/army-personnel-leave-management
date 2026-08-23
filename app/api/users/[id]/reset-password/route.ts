import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const resetSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const { id } = await params;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = resetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(result.data.newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await createAuditLog({
      actorId: user.id,
      action: "AUTH_PASSWORD_RESET",
      entityType: "User",
      entityId: id,
      reason: `Admin reset password for ${targetUser.email}`,
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${targetUser.email}`,
    });
  } catch (error) {
    console.error("Admin Reset Password Error:", error);
    return NextResponse.json({ success: false, error: "Failed to reset password" }, { status: 500 });
  }
}
