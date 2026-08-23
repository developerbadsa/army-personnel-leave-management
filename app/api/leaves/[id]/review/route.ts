import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  LeaveRequestStatus,
  ReviewDecision,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const reviewSchema = z.object({
  decision: z.nativeEnum(ReviewDecision),
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
      return NextResponse.json({ success: false, error: "Forbidden: Moderator or Admin role required" }, { status: 403 });
    }

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        personnel: { include: { unit: true, section: true } },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    // Check scope
    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, leaveRequest.personnel)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Personnel is outside your assigned unit/section scope" },
        { status: 403 }
      );
    }

    // Check valid status for review
    if (
      leaveRequest.status !== LeaveRequestStatus.PENDING_REVIEW &&
      leaveRequest.status !== LeaveRequestStatus.UNDER_REVIEW
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot review request in current status: ${leaveRequest.status}`,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = reviewSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { decision, remarks } = result.data;
    let nextStatus: LeaveRequestStatus = LeaveRequestStatus.PENDING_FINAL_APPROVAL;
    let recommendedAt: Date | null = null;
    let rejectedAt: Date | null = null;
    let correctionIncrement = 0;

    if (decision === ReviewDecision.RECOMMEND) {
      nextStatus = LeaveRequestStatus.PENDING_FINAL_APPROVAL;
      recommendedAt = new Date();
    } else if (decision === ReviewDecision.RETURN_FOR_CORRECTION) {
      nextStatus = LeaveRequestStatus.RETURNED_FOR_CORRECTION;
      correctionIncrement = 1;
    } else if (decision === ReviewDecision.REJECT) {
      nextStatus = LeaveRequestStatus.REJECTED;
      rejectedAt = new Date();
    }

    // Execute review within a transaction
    const [updatedRequest, reviewRecord] = await prisma.$transaction(async (tx) => {
      const review = await tx.leaveReview.create({
        data: {
          leaveRequestId: id,
          reviewerId: user.id,
          decision,
          remarks,
        },
      });

      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          recommendedAt: recommendedAt ?? undefined,
          rejectedAt: rejectedAt ?? undefined,
          correctionCount: { increment: correctionIncrement },
        },
      });

      // If rejected, release reserved balance
      if (decision === ReviewDecision.REJECT) {
        const year = leaveRequest.startDate.getFullYear();
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

      return [updated, review];
    });

    // Audit Log
    await createAuditLog({
      actorId: user.id,
      action: `LEAVE_REVIEW_${decision}`,
      entityType: "LeaveRequest",
      entityId: id,
      oldValue: { status: leaveRequest.status },
      newValue: { status: nextStatus, decision, remarks },
      reason: remarks || `Moderator review decision: ${decision}`,
    });

    // Notify Applicant
    if (leaveRequest.applicantId) {
      await createNotification({
        recipientId: leaveRequest.applicantId,
        actorId: user.id,
        type:
          decision === ReviewDecision.RECOMMEND
            ? NotificationType.LEAVE_RECOMMENDED
            : decision === ReviewDecision.RETURN_FOR_CORRECTION
            ? NotificationType.LEAVE_RETURNED
            : NotificationType.LEAVE_REJECTED,
        title: `Leave Request #${leaveRequest.requestNumber} ${decision}`,
        message: `Your leave request has been reviewed with decision: ${decision}. ${remarks ? `Remarks: ${remarks}` : ""}`,
        entityType: "LeaveRequest",
        entityId: id,
      });
    }

    // If Recommended, Notify Commander & Quarter Master
    if (decision === ReviewDecision.RECOMMEND) {
      const authorities = await prisma.user.findMany({
        where: {
          approvalAuthority: { in: ["COMMANDER", "QUARTER_MASTER"] },
          status: "ACTIVE",
        },
        select: { id: true },
      });

      for (const auth of authorities) {
        await createNotification({
          recipientId: auth.id,
          actorId: user.id,
          type: NotificationType.LEAVE_RECOMMENDED,
          title: "Leave Awaiting Final Approval",
          message: `Leave request #${leaveRequest.requestNumber} for ${leaveRequest.personnel.fullName} is recommended and awaiting final approval.`,
          entityType: "LeaveRequest",
          entityId: id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        request: updatedRequest,
        review: reviewRecord,
      },
    });
  } catch (error) {
    console.error("Review Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process review" }, { status: 500 });
  }
}
