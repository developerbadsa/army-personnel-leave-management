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
      include: { personnel: { include: { unit: true, section: true } } },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    const submittableStatuses: string[] = [LeaveRequestStatus.DRAFT, LeaveRequestStatus.RETURNED_FOR_CORRECTION];
    if (!submittableStatuses.includes(leaveRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot submit request in status: ${leaveRequest.status}` },
        { status: 400 }
      );
    }

    // Permission check
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
      action: "LEAVE_SUBMITTED",
      entityType: "LeaveRequest",
      entityId: id,
      oldValue: { status: leaveRequest.status },
      newValue: { status: LeaveRequestStatus.PENDING_REVIEW },
      reason: `Submitted leave request #${leaveRequest.requestNumber}`,
    });

    // Notify assigned moderators
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
        title: "Leave Application Submitted",
        message: `${leaveRequest.personnel.fullName} (${leaveRequest.personnel.serviceId}) submitted leave request #${leaveRequest.requestNumber}.`,
        entityType: "LeaveRequest",
        entityId: id,
      });
    }

    // Confirmation to the applicant
    await emailUsers({
      userIds: [user.id],
      subject: `Leave application submitted — #${leaveRequest.requestNumber}`,
      heading: "Leave application submitted successfully",
      paragraphs: [
        `Your leave application #${leaveRequest.requestNumber} has been submitted and is now pending review.`,
        "You will be notified by email once a moderator or approver takes action on it.",
      ],
      ctaLabel: "View My Requests",
      ctaUrl: `${appBaseUrl()}/leaves/my`,
    });

    // Email assigned moderators
    await emailUsers({
      userIds: moderatorIds,
      subject: `Leave Application Submitted #${leaveRequest.requestNumber}`,
      heading: "Leave Application Submitted",
      paragraphs: [
        `${leaveRequest.personnel.fullName} (${leaveRequest.personnel.serviceId}) submitted leave request #${leaveRequest.requestNumber}.`,
      ],
      ctaLabel: "Review Application",
      ctaUrl: `${appBaseUrl()}/leaves/${id}`,
    });

    // Email all active admins
    await emailActiveAdmins({
      subject: `Leave Application Submitted #${leaveRequest.requestNumber}`,
      heading: "Leave Application Submitted",
      paragraphs: [
        `${leaveRequest.personnel.fullName} (${leaveRequest.personnel.serviceId}) submitted leave request #${leaveRequest.requestNumber}.`,
      ],
      ctaLabel: "Review Application",
      ctaUrl: `${appBaseUrl()}/leaves/${id}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Submit Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit leave request" }, { status: 500 });
  }
}
