import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const roleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export async function PATCH(
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
    const result = roleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: result.data.role },
      select: { id: true, email: true, role: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: "ROLE_CHANGED",
      entityType: "User",
      entityId: id,
      oldValue: { role: targetUser.role },
      newValue: { role: updated.role },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH User Role Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update role" }, { status: 500 });
  }
}
