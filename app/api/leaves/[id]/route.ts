import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, NotificationType, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const updateLeaveSchema = z.object({
  leaveTypeId: z.string().optional(),
  startDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid end date"),
  reason: z.string().min(3).optional(),
  contactDuringLeave: z.string().optional().nullable(),
  addressDuringLeave: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
});

function calculateDays(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        personnel: {
          include: {
            unit: true,
            section: true,
            user: { select: { id: true, email: true, role: true } },
          },
        },
        leaveType: true,
        attachments: true,
        reviews: {
          include: { reviewer: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        approvals: {
          include: { approver: { select: { id: true, email: true, approvalAuthority: true } } },
          orderBy: { approvedAt: "asc" },
        },
        returnRecord: {
          include: { markedReturnedBy: { select: { id: true, email: true } } },
        },
        createdBy: { select: { id: true, email: true, role: true } },
        applicant: { select: { id: true, email: true } },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    if (user.role === UserRole.USER && leaveRequest.applicantId !== user.id && leaveRequest.personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only view your own requests" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, leaveRequest.personnel) && leaveRequest.applicantId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: Leave request is outside your assigned scope" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error("GET Leave Details Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave details" }, { status: 500 });
  }
}

export async function PATCH(
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

    // Only the applicant or creator can edit, and only if in editable status
    const editableStatuses: string[] = [LeaveRequestStatus.DRAFT, LeaveRequestStatus.PENDING_REVIEW, LeaveRequestStatus.RETURNED_FOR_CORRECTION];
    if (!editableStatuses.includes(leaveRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot edit request in status: ${leaveRequest.status}` },
        { status: 400 }
      );
    }

    if (user.role === UserRole.USER && leaveRequest.applicantId !== user.id && leaveRequest.createdById !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only edit your own requests" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && leaveRequest.applicantId !== user.id && leaveRequest.createdById !== user.id) {
      if (!canModeratorAccessPersonnel(user, leaveRequest.personnel)) {
        return NextResponse.json({ success: false, error: "Forbidden: Outside your assigned scope" }, { status: 403 });
      }
    }

    const body = await req.json();
    const result = updateLeaveSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const updateData: Prisma.LeaveRequestUpdateInput = {
      contactDuringLeave: data.contactDuringLeave,
      addressDuringLeave: data.addressDuringLeave,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
    };

    if (data.reason) updateData.reason = data.reason;
    if (data.leaveTypeId) {
      const lt = await prisma.leaveType.findUnique({ where: { id: data.leaveTypeId } });
      if (!lt || !lt.isActive) {
        return NextResponse.json({ success: false, error: "Invalid leave type" }, { status: 400 });
      }
      updateData.leaveType = { connect: { id: data.leaveTypeId } };
    }

    if (data.startDate || data.endDate) {
      const start = data.startDate ? new Date(data.startDate) : leaveRequest.startDate;
      const end = data.endDate ? new Date(data.endDate) : leaveRequest.endDate;
      if (end < start) {
        return NextResponse.json({ success: false, error: "End date cannot be before start date" }, { status: 400 });
      }
      updateData.startDate = start;
      updateData.endDate = end;
      updateData.totalDays = calculateDays(start, end);
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
      include: { leaveType: true, personnel: { select: { fullName: true, serviceId: true } } },
    });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_UPDATED",
      entityType: "LeaveRequest",
      entityId: id,
      oldValue: { reason: leaveRequest.reason, status: leaveRequest.status },
      newValue: { reason: updated.reason, status: updated.status },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update leave request" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    // Only DRAFT requests can be fully deleted
    if (leaveRequest.status !== LeaveRequestStatus.DRAFT) {
      return NextResponse.json(
        { success: false, error: "Only draft requests can be deleted. Use cancel for submitted requests." },
        { status: 400 }
      );
    }

    if (user.role === UserRole.USER && leaveRequest.createdById !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.leaveRequest.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_DELETED",
      entityType: "LeaveRequest",
      entityId: id,
      oldValue: leaveRequest as unknown as Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, message: "Leave request deleted" });
  } catch (error) {
    console.error("DELETE Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete leave request" }, { status: 500 });
  }
}
