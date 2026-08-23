import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveReturnStatus, PersonnelStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const markReturnSchema = z.object({
  actualReturnDate: z.string().optional(),
  remarks: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN, UserRole.MODERATOR])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or Moderator required" }, { status: 403 });
    }

    const { id } = await params;
    const leaveReturn = await prisma.leaveReturn.findUnique({
      where: { id },
      include: {
        personnel: true,
        leaveRequest: true,
      },
    });

    if (!leaveReturn) {
      return NextResponse.json({ success: false, error: "Return record not found" }, { status: 404 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, leaveReturn.personnel)) {
      return NextResponse.json({ success: false, error: "Forbidden: Personnel outside assigned scope" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const result = markReturnSchema.safeParse(body);
    const actualDate = result.success && result.data.actualReturnDate
      ? new Date(result.data.actualReturnDate)
      : new Date();
    const remarks = result.success ? result.data.remarks : null;

    const [updatedReturn] = await prisma.$transaction([
      prisma.leaveReturn.update({
        where: { id },
        data: {
          actualReturnDate: actualDate,
          status: LeaveReturnStatus.RETURNED,
          remarks: remarks ?? undefined,
          markedReturnedById: user.id,
        },
      }),
      prisma.personnel.update({
        where: { id: leaveReturn.personnelId },
        data: { status: PersonnelStatus.ACTIVE },
      }),
    ]);

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_RETURN_MARKED",
      entityType: "LeaveReturn",
      entityId: id,
      newValue: {
        status: LeaveReturnStatus.RETURNED,
        actualReturnDate: actualDate,
        remarks,
      },
      reason: remarks || `Marked returned from leave #${leaveReturn.leaveRequest.requestNumber}`,
    });

    return NextResponse.json({ success: true, data: updatedReturn });
  } catch (error) {
    console.error("Mark Return Error:", error);
    return NextResponse.json({ success: false, error: "Failed to mark return" }, { status: 500 });
  }
}
