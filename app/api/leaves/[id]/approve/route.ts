import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasApprovalAuthority, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  ApprovalAuthority,
  ApprovalDecision,
  LeaveRequestStatus,
  LeaveReturnStatus,
  NotificationType,
} from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const approvalSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  remarks: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const isAuthority = hasApprovalAuthority(user, [
      ApprovalAuthority.COMMANDER,
      ApprovalAuthority.QUARTER_MASTER,
    ]);
    const isAdmin = hasRole(user, [UserRole.ADMIN]);

    if (!isAuthority && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Only Commander or Quarter Master authority can grant final approval",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        personnel: true,
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    if (leaveRequest.status !== LeaveRequestStatus.PENDING_FINAL_APPROVAL && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot approve request in current status: ${leaveRequest.status}`,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = approvalSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { decision, remarks } = result.data;
    const authorityUsed =
      user.approvalAuthority !== ApprovalAuthority.NONE
        ? user.approvalAuthority
        : ApprovalAuthority.COMMANDER; // fallback if admin override

    let nextStatus: LeaveRequestStatus = LeaveRequestStatus.APPROVED;
    let finalApprovedAt: Date | null = null;
    let rejectedAt: Date | null = null;

    if (decision === ApprovalDecision.APPROVE) {
      nextStatus = LeaveRequestStatus.APPROVED;
      finalApprovedAt = new Date();
    } else if (decision === ApprovalDecision.REJECT) {
      nextStatus = LeaveRequestStatus.REJECTED;
      rejectedAt = new Date();
    } else if (decision === ApprovalDecision.RETURN_FOR_CORRECTION) {
      nextStatus = LeaveRequestStatus.RETURNED_FOR_CORRECTION;
    }

    // Atomic Transaction for Final Decision
    const [updatedRequest, approvalRecord] = await prisma.$transaction(async (tx) => {
      // 1. Create Approval record
      const approval = await tx.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverId: user.id,
          authority: authorityUsed,
          decision,
          remarks,
        },
      });

      // 2. Update Request Status
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          finalApprovedAt: finalApprovedAt ?? undefined,
          rejectedAt: rejectedAt ?? undefined,
        },
      });

      const year = leaveRequest.startDate.getFullYear();

      // 3. Balance Adjustments
      if (decision === ApprovalDecision.APPROVE) {
        // Move from reserved to used
        await tx.leaveBalance.updateMany({
          where: {
            personnelId: leaveRequest.personnelId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year,
          },
          data: {
            reservedDays: { decrement: leaveRequest.totalDays },
            usedDays: { increment: leaveRequest.totalDays },
          },
        });

        // 4. Create Return Record
        await tx.leaveReturn.upsert({
          where: { leaveRequestId: id },
          update: {
            expectedReturnDate: leaveRequest.endDate,
            status: LeaveReturnStatus.NOT_STARTED,
          },
          create: {
            leaveRequestId: id,
            personnelId: leaveRequest.personnelId,
            expectedReturnDate: leaveRequest.endDate,
            status: LeaveReturnStatus.NOT_STARTED,
          },
        });
      } else if (decision === ApprovalDecision.REJECT) {
        // Release reserved days
        await tx.leaveBalance.updateMany({
          where: {
            personnelId: leaveRequest.personnelId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year,
          },
          data: {
            reservedDays: { decrement: leaveRequest.totalDays },
          },
        });
      }

      return [updated, approval];
    });

    // Audit Log
    await createAuditLog({
      actorId: user.id,
      action: `LEAVE_FINAL_${decision}`,
      entityType: "LeaveRequest",
      entityId: id,
      oldValue: { status: leaveRequest.status },
      newValue: { status: nextStatus, decision, authority: authorityUsed, remarks },
      reason: remarks || `Final approval decision by ${authorityUsed}: ${decision}`,
    });

    // Notify Applicant
    if (leaveRequest.applicantId) {
      await createNotification({
        recipientId: leaveRequest.applicantId,
        actorId: user.id,
        type:
          decision === ApprovalDecision.APPROVE
            ? NotificationType.LEAVE_APPROVED
            : decision === ApprovalDecision.REJECT
            ? NotificationType.LEAVE_REJECTED
            : NotificationType.LEAVE_RETURNED,
        title: `Leave Request #${leaveRequest.requestNumber} ${decision}`,
        message: `Final approval decision: ${decision} by ${authorityUsed}. ${remarks ? `Remarks: ${remarks}` : ""}`,
        entityType: "LeaveRequest",
        entityId: id,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        request: updatedRequest,
        approval: approvalRecord,
      },
    });
  } catch (error) {
    console.error("Approve Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process approval" }, { status: 500 });
  }
}
