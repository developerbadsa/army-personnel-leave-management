import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ApprovalAuthority, UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const authoritySchema = z.object({
  approvalAuthority: z.nativeEnum(ApprovalAuthority),
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
    const result = authoritySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { approvalAuthority } = result.data;

    // If setting to Commander or Quarter Master, check no other active user has that authority
    if (approvalAuthority !== ApprovalAuthority.NONE) {
    const existing = await prisma.user.findFirst({
      where: {
        approvalAuthority,
        status: "ACTIVE",
        id: { not: id },
      },
      include: { personnel: { select: { rank: true, fullName: true } } },
    });

      if (existing) {
        const personnelName = existing.personnel
          ? `${existing.personnel.rank} ${existing.personnel.fullName}`
          : existing.email;
        return NextResponse.json(
          {
            success: false,
            error: `Another user (${personnelName}) already holds the ${approvalAuthority} authority. Revoke their authority first.`,
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { approvalAuthority },
      select: { id: true, email: true, approvalAuthority: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: "AUTHORITY_CHANGED",
      entityType: "User",
      entityId: id,
      oldValue: { approvalAuthority: targetUser.approvalAuthority },
      newValue: { approvalAuthority: updated.approvalAuthority },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH Approval Authority Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update approval authority" }, { status: 500 });
  }
}
