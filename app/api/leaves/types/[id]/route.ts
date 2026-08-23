import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateLeaveTypeSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).toUpperCase().optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  requiresAttachment: z.boolean().optional(),
  allowHalfDay: z.boolean().optional(),
  allowBackdated: z.boolean().optional(),
  defaultAllowance: z.number().nonnegative().optional().nullable(),
  minDays: z.number().positive().optional().nullable(),
  maxDays: z.number().positive().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
      include: {
        policies: {
          orderBy: { effectiveFrom: "desc" },
        },
      },
    });

    if (!leaveType) {
      return NextResponse.json({ success: false, error: "Leave type not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: leaveType });
  } catch (error) {
    console.error("GET Leave Type Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave type" }, { status: 500 });
  }
}

export async function PUT(
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
    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Leave type not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updateLeaveTypeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveType.update({
      where: { id },
      data: result.data,
    });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_TYPE_UPDATED",
      entityType: "LeaveType",
      entityId: id,
      oldValue: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValue: updated as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT Leave Type Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update leave type" }, { status: 500 });
  }
}

export async function DELETE(
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
    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Leave type not found" }, { status: 404 });
    }

    // Check for existing leave requests using this type
    const requestCount = await prisma.leaveRequest.count({
      where: {
        leaveTypeId: id,
        status: {
          notIn: ["REJECTED", "CANCELLED"],
        },
      },
    });

    if (requestCount > 0) {
      // Soft-delete: deactivate instead
      const updated = await prisma.leaveType.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        actorId: user.id,
        action: "LEAVE_TYPE_DEACTIVATED",
        entityType: "LeaveType",
        entityId: id,
        oldValue: { isActive: existing.isActive },
        newValue: { isActive: false },
        reason: `Deactivated instead of deleting — ${requestCount} active leave request(s) reference this type`,
      });

      return NextResponse.json({
        success: true,
        message: "Leave type deactivated (still referenced by existing requests)",
        data: updated,
      });
    }

    // No active references - hard delete
    await prisma.leaveType.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_TYPE_DELETED",
      entityType: "LeaveType",
      entityId: id,
      oldValue: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, message: "Leave type deleted successfully" });
  } catch (error) {
    console.error("DELETE Leave Type Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete leave type" }, { status: 500 });
  }
}
