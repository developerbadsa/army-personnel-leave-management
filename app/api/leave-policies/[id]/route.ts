import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updatePolicySchema = z.object({
  effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date").optional(),
  effectiveTo: z.string().optional().nullable(),
  allocationDays: z.number().nonnegative().optional(),
  carryForwardLimit: z.number().nonnegative().optional().nullable(),
  maxConsecutiveDays: z.number().positive().optional().nullable(),
  requiresApproval: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const policy = await prisma.leavePolicy.findUnique({
      where: { id },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
      },
    });

    if (!policy) {
      return NextResponse.json({ success: false, error: "Leave policy not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    console.error("GET Leave Policy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave policy" }, { status: 500 });
  }
}

export async function PATCH(
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
    const existing = await prisma.leavePolicy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Leave policy not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updatePolicySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const updateData: Record<string, unknown> = {};
    if (data.effectiveFrom) updateData.effectiveFrom = new Date(data.effectiveFrom);
    if (data.effectiveTo !== undefined) updateData.effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : null;
    if (data.allocationDays !== undefined) updateData.allocationDays = data.allocationDays;
    if (data.carryForwardLimit !== undefined) updateData.carryForwardLimit = data.carryForwardLimit;
    if (data.maxConsecutiveDays !== undefined) updateData.maxConsecutiveDays = data.maxConsecutiveDays;
    if (data.requiresApproval !== undefined) updateData.requiresApproval = data.requiresApproval;

    const updated = await prisma.leavePolicy.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_POLICY_UPDATED",
      entityType: "LeavePolicy",
      entityId: id,
      oldValue: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValue: updated as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH Leave Policy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update leave policy" }, { status: 500 });
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
    const existing = await prisma.leavePolicy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Leave policy not found" }, { status: 404 });
    }

    await prisma.leavePolicy.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_POLICY_DELETED",
      entityType: "LeavePolicy",
      entityId: id,
      oldValue: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, message: "Leave policy deleted successfully" });
  } catch (error) {
    console.error("DELETE Leave Policy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete leave policy" }, { status: 500 });
  }
}
