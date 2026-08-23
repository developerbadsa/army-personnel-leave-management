import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
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
    const existing = await prisma.moderatorAssignment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }

    const updated = await prisma.moderatorAssignment.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });

    await createAuditLog({
      actorId: user.id,
      action: "MODERATOR_ASSIGNMENT_REVOKED",
      entityType: "ModeratorAssignment",
      entityId: id,
      oldValue: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValue: updated as unknown as import("@prisma/client").Prisma.InputJsonValue,
      reason: "Admin revoked moderator assignment",
    });

    return NextResponse.json({ success: true, message: "Assignment revoked successfully" });
  } catch (error) {
    console.error("DELETE Assignment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to revoke assignment" }, { status: 500 });
  }
}
