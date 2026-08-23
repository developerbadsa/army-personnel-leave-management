import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

const cancelableStatuses: string[] = [
  LeaveRequestStatus.DRAFT,
  LeaveRequestStatus.PENDING_REVIEW,
  LeaveRequestStatus.UNDER_REVIEW,
  LeaveRequestStatus.RETURNED_FOR_CORRECTION,
  LeaveRequestStatus.RECOMMENDED,
  LeaveRequestStatus.PENDING_FINAL_APPROVAL,
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { personnel: true },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    if (!cancelableStatuses.includes(leaveRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel request in status: ${leaveRequest.status}` },
        { status: 400 }
      );
    }

    // Applicant, creator, or admin can cancel
    if (user.role === UserRole.USER && leaveRequest.createdById !== user.id && leaveRequest.applicantId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only cancel your own requests" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && leaveRequest.createdById !== user.id && leaveRequest.applicantId !== user.id) {
      if (!canModeratorAccessPersonnel(user, leaveRequest.personnel)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const year = leaveRequest.startDate.getFullYear();

    const [updated] = await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id },
        data: { status: LeaveRequestStatus.CANCELLED },
      }),
      // Release reserved balance
      prisma.leaveBalance.updateMany({
        where: {
          personnelId: leaveRequest.personnelId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year,
        },
        data: {
          reservedDays: { decrement: leaveRequest.totalDays },
        },
      }),
    ]);

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_CANCELLED",
      entityType: "LeaveRequest",
      entityId: id,
      oldValue: { status: leaveRequest.status },
      newValue: { status: LeaveRequestStatus.CANCELLED },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Cancel Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to cancel leave request" }, { status: 500 });
  }
}
