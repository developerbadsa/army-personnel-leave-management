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
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Cannot disable yourself
    if (existing.id === user.id) {
      return NextResponse.json({ success: false, error: "You cannot disable your own account" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: "DISABLED" },
      select: { id: true, email: true, status: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: "USER_DISABLED",
      entityType: "User",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: "DISABLED" },
      reason: "Admin disabled user account",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("DELETE User Error:", error);
    return NextResponse.json({ success: false, error: "Failed to disable user" }, { status: 500 });
  }
}
