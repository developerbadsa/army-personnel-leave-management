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
