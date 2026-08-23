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

const updateReturnSchema = z.object({
  remarks: z.string().optional().nullable(),
  expectedReturnDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const leaveReturn = await prisma.leaveReturn.findUnique({
      where: { id },
      include: {
        personnel: {
          include: {
            unit: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
            user: { select: { id: true, email: true } },
          },
        },
        leaveRequest: {
          include: { leaveType: true },
        },
        markedReturnedBy: {
          select: { id: true, email: true },
        },
      },
    });

    if (!leaveReturn) {
      return NextResponse.json({ success: false, error: "Return record not found" }, { status: 404 });
    }

    // Authorization
    if (user.role === UserRole.USER && leaveReturn.personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, leaveReturn.personnel) && leaveReturn.personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const isOverdue = !leaveReturn.actualReturnDate && new Date(leaveReturn.expectedReturnDate) < now;

    return NextResponse.json({
      success: true,
      data: {
        ...leaveReturn,
        computedStatus: isOverdue ? LeaveReturnStatus.OVERDUE : leaveReturn.status,
        daysOverdue: isOverdue
          ? Math.ceil((now.getTime() - new Date(leaveReturn.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      },
    });
  } catch (error) {
    console.error("GET Return Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch return record" }, { status: 500 });
  }
}

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

export async function PATCH(
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
      include: { personnel: true },
    });

    if (!leaveReturn) {
      return NextResponse.json({ success: false, error: "Return record not found" }, { status: 404 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, leaveReturn.personnel)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateReturnSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { remarks, expectedReturnDate } = result.data;
    const updateData: { remarks?: string | null; expectedReturnDate?: Date } = {};
    if (remarks !== undefined) updateData.remarks = remarks;
    if (expectedReturnDate) updateData.expectedReturnDate = new Date(expectedReturnDate);

    const updated = await prisma.leaveReturn.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      actorId: user.id,
      action: "RETURN_UPDATED",
      entityType: "LeaveReturn",
      entityId: id,
      newValue: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH Return Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update return" }, { status: 500 });
  }
}
