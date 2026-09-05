import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, NotificationType } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emailUsers, emailActiveAdmins, appBaseUrl } from "@/lib/email";

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
      include: {
        personnel: { include: { unit: true, section: true } },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    if (leaveRequest.status !== LeaveRequestStatus.RETURNED_FOR_CORRECTION) {
      return NextResponse.json(
        { success: false, error: `Cannot resubmit request in status: ${leaveRequest.status}. Only corrected requests can be resubmitted.` },
        { status: 400 }
      );
    }

    if (user.role === UserRole.USER && leaveRequest.createdById !== user.id && leaveRequest.applicantId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && leaveRequest.createdById !== user.id && leaveRequest.applicantId !== user.id) {
      if (!canModeratorAccessPersonnel(user, leaveRequest.personnel)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.PENDING_REVIEW,
          submittedAt: new Date(),
        },
      }),
    ]);

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_RESUBMITTED",
      entityType: "LeaveRequest",
      entityId: id,
      oldValue: { status: LeaveRequestStatus.RETURNED_FOR_CORRECTION },
      newValue: { status: LeaveRequestStatus.PENDING_REVIEW },
      reason: `Resubmitted leave request #${leaveRequest.requestNumber} after correction`,
    });

    // Notify moderators
    const moderatorAssignments = await prisma.moderatorAssignment.findMany({
      where: {
        isActive: true,
        OR: [
          { unitId: leaveRequest.personnel.unitId },
          { sectionId: leaveRequest.personnel.sectionId || undefined },
        ],
      },
      select: { moderatorId: true },
    });

    const moderatorIds = moderatorAssignments.map((m) => m.moderatorId);

    for (const m of moderatorAssignments) {
      await createNotification({
        recipientId: m.moderatorId,
        actorId: user.id,
        type: NotificationType.LEAVE_SUBMITTED,
        title: "Corrected Leave Resubmitted",
        message: `${leaveRequest.personnel.fullName} resubmitted leave request #${leaveRequest.requestNumber} after corrections.`,
        entityType: "LeaveRequest",
        entityId: id,
      });
    }

    // Email assigned moderators
    await emailUsers({
      userIds: moderatorIds,
      subject: `Corrected Leave Resubmitted #${leaveRequest.requestNumber}`,
      heading: "Corrected Leave Resubmitted",
      paragraphs: [
        `${leaveRequest.personnel.fullName} resubmitted leave request #${leaveRequest.requestNumber} after corrections.`,
      ],
      ctaLabel: "Review Application",
      ctaUrl: `${appBaseUrl()}/leaves/${id}`,
    });

    // Email all active admins
    await emailActiveAdmins({
      subject: `Corrected Leave Resubmitted #${leaveRequest.requestNumber}`,
      heading: "Corrected Leave Resubmitted",
      paragraphs: [
        `${leaveRequest.personnel.fullName} resubmitted leave request #${leaveRequest.requestNumber} after corrections.`,
      ],
      ctaLabel: "Review Application",
      ctaUrl: `${appBaseUrl()}/leaves/${id}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Resubmit Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to resubmit leave request" }, { status: 500 });
  }
}
