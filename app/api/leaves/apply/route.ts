import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, NotificationType, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emailUsers, emailActiveAdmins, appBaseUrl } from "@/lib/email";
import { z } from "zod";

const applyLeaveSchema = z.object({
  personnelId: z.string().min(1, "Personnel ID is required"),
  leaveTypeId: z.string().min(1, "Leave Type ID is required"),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
  reason: z.string().min(3, "Reason is required"),
  contactDuringLeave: z.string().optional().nullable(),
  addressDuringLeave: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
      })
    )
    .optional(),
});

function calculateDays(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = applyLeaveSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      personnelId,
      leaveTypeId,
      startDate: startStr,
      endDate: endStr,
      reason,
      contactDuringLeave,
      addressDuringLeave,
      emergencyContactName,
      emergencyContactPhone,
    } = result.data;

    const start = new Date(startStr);
    const end = new Date(endStr);

    if (end < start) {
      return NextResponse.json(
        { success: false, error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    const totalDays = calculateDays(start, end);

    // Target Personnel check
    const personnel = await prisma.personnel.findUnique({
      where: { id: personnelId },
      include: { user: true, unit: true, section: true },
    });

    if (!personnel) {
      return NextResponse.json({ success: false, error: "Personnel not found" }, { status: 404 });
    }

    // Permission check for submitting
    if (user.role === UserRole.USER && personnel.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only apply for your own leave" },
        { status: 403 }
      );
    }

    if (
      user.role === UserRole.MODERATOR &&
      personnel.userId !== user.id &&
      !canModeratorAccessPersonnel(user, personnel)
    ) {
      return NextResponse.json(
        { success: false, error: "Personnel is outside your assigned unit/section" },
        { status: 403 }
      );
    }

    // Leave Type & Rules check
    const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType || !leaveType.isActive) {
      return NextResponse.json({ success: false, error: "Invalid or inactive leave type" }, { status: 400 });
    }

    if (leaveType.minDays && totalDays < Number(leaveType.minDays)) {
      return NextResponse.json(
        { success: false, error: `Minimum duration for ${leaveType.name} is ${leaveType.minDays} day(s)` },
        { status: 400 }
      );
    }

    if (leaveType.maxDays && totalDays > Number(leaveType.maxDays)) {
      return NextResponse.json(
        { success: false, error: `Maximum duration for ${leaveType.name} is ${leaveType.maxDays} day(s)` },
        { status: 400 }
      );
    }

    // 1. Conflict Detection (Date overlap)
    const overlappingRequests = await prisma.leaveRequest.findMany({
      where: {
        personnelId,
        status: {
          notIn: [LeaveRequestStatus.REJECTED, LeaveRequestStatus.CANCELLED],
        },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlappingRequests.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Date conflict: Personnel already has an active leave application (#${overlappingRequests[0].requestNumber}) overlapping these dates.`,
        },
        { status: 409 }
      );
    }

    // 2. Balance Ledger Check
    const currentYear = start.getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: {
        personnelId_leaveTypeId_year: {
          personnelId,
          leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          personnelId,
          leaveTypeId,
          year: currentYear,
          allocatedDays: leaveType.defaultAllowance ?? 0,
        },
      });
    }

    const allocated = Number(balance.allocatedDays);
    const carry = Number(balance.carryForward);
    const adjustment = Number(balance.adjustmentDays);
    const used = Number(balance.usedDays);
    const reserved = Number(balance.reservedDays);
    const remainingDays = allocated + carry + adjustment - used - reserved;

    if (remainingDays < totalDays) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient leave balance. Requested: ${totalDays} day(s), Available: ${remainingDays} day(s).`,
        },
        { status: 400 }
      );
    }

    // Generate Request Number (e.g. LV-202608-0001)
    const datePrefix = `LV-${currentYear}${String(start.getMonth() + 1).padStart(2, "0")}`;
    const countThisMonth = await prisma.leaveRequest.count({
      where: { requestNumber: { startsWith: datePrefix } },
    });
    const requestNumber = `${datePrefix}-${String(countThisMonth + 1).padStart(4, "0")}`;

    // Transactional Save: Create Leave Request & Reserve Balance
    const [leaveRequest] = await prisma.$transaction([
      prisma.leaveRequest.create({
        data: {
          requestNumber,
          personnelId,
          applicantId: personnel.userId,
          createdById: user.id,
          leaveTypeId,
          startDate: start,
          endDate: end,
          totalDays: new Prisma.Decimal(totalDays),
          reason,
          contactDuringLeave,
          addressDuringLeave,
          emergencyContactName,
          emergencyContactPhone,
          status: LeaveRequestStatus.PENDING_REVIEW,
          submittedAt: new Date(),
          ...(result.data.attachments && result.data.attachments.length > 0
            ? {
                attachments: {
                  create: result.data.attachments.map((att) => ({
                    fileName: att.fileName,
                    fileUrl: att.fileUrl,
                    mimeType: att.mimeType,
                    fileSize: att.fileSize,
                    uploadedById: user.id,
                  })),
                },
              }
            : {}),
        },
        include: {
          personnel: { select: { fullName: true, serviceId: true, unit: true, section: true } },
          leaveType: true,
          attachments: true,
        },
      }),
      prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          reservedDays: new Prisma.Decimal(reserved + totalDays),
        },
      }),
    ]);

    // Audit Log
    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_SUBMITTED",
      entityType: "LeaveRequest",
      entityId: leaveRequest.id,
      newValue: leaveRequest as unknown as Prisma.InputJsonValue,
      reason: `Submitted leave request #${requestNumber} for ${totalDays} day(s)`,
    });

    // Notify Assigned Moderators
    const moderatorAssignments = await prisma.moderatorAssignment.findMany({
      where: {
        isActive: true,
        OR: [
          { unitId: personnel.unitId },
          { sectionId: personnel.sectionId || undefined },
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
        title: "New Leave Application",
        message: `${personnel.fullName} (${personnel.serviceId}) submitted leave request #${requestNumber} (${totalDays} days).`,
        entityType: "LeaveRequest",
        entityId: leaveRequest.id,
      });
    }

    // Confirmation to the applicant
    await emailUsers({
      userIds: [user.id],
      subject: `Leave application received — #${requestNumber}`,
      heading: "Leave application submitted successfully",
      paragraphs: [
        `Your leave application #${requestNumber} (${totalDays} day(s)) has been submitted and is now pending review.`,
        "You will be notified by email once a moderator or approver takes action on it.",
      ],
      ctaLabel: "View My Requests",
      ctaUrl: `${appBaseUrl()}/leaves/my`,
    });

    // Email assigned moderators
    await emailUsers({
      userIds: moderatorIds,
      subject: `New Leave Application #${requestNumber}`,
      heading: "New Leave Application",
      paragraphs: [
        `${personnel.fullName} (${personnel.serviceId}) submitted a leave application of ${totalDays} day(s).`,
        `Request Number: ${requestNumber}`,
      ],
      ctaLabel: "Review Application",
      ctaUrl: `${appBaseUrl()}/leaves/${leaveRequest.id}`,
    });

    // Email all active admins
    await emailActiveAdmins({
      subject: `New Leave Application #${requestNumber}`,
      heading: "New Leave Application",
      paragraphs: [
        `${personnel.fullName} (${personnel.serviceId}) submitted a leave application of ${totalDays} day(s).`,
        `Request Number: ${requestNumber}`,
      ],
      ctaLabel: "Review Application",
      ctaUrl: `${appBaseUrl()}/leaves/${leaveRequest.id}`,
    });

    return NextResponse.json({ success: true, data: leaveRequest }, { status: 201 });
  } catch (error) {
    console.error("Apply Leave Error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit leave application" }, { status: 500 });
  }
}
