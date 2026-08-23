import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createPolicySchema = z.object({
  leaveTypeId: z.string().min(1, "Leave Type ID is required"),
  effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  effectiveTo: z.string().optional().nullable(),
  allocationDays: z.number().nonnegative("Allocation must be non-negative"),
  carryForwardLimit: z.number().nonnegative().optional().nullable(),
  maxConsecutiveDays: z.number().positive().optional().nullable(),
  requiresApproval: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const leaveTypeId = searchParams.get("leaveTypeId");

    const policies = await prisma.leavePolicy.findMany({
      where: leaveTypeId ? { leaveTypeId } : undefined,
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    console.error("GET Leave Policies Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave policies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const result = createPolicySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify leave type exists
    const leaveType = await prisma.leaveType.findUnique({ where: { id: data.leaveTypeId } });
    if (!leaveType) {
      return NextResponse.json({ success: false, error: "Leave type not found" }, { status: 404 });
    }

    // Check for overlapping effective dates
    const overlapping = await prisma.leavePolicy.findFirst({
      where: {
        leaveTypeId: data.leaveTypeId,
        effectiveFrom: { lte: new Date(data.effectiveTo || "2099-12-31") },
        effectiveTo: data.effectiveTo
          ? { gte: new Date(data.effectiveFrom) }
          : null,
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { success: false, error: "A policy with overlapping effective dates already exists for this leave type" },
        { status: 409 }
      );
    }

    const policy = await prisma.leavePolicy.create({
      data: {
        leaveTypeId: data.leaveTypeId,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        allocationDays: data.allocationDays,
        carryForwardLimit: data.carryForwardLimit,
        maxConsecutiveDays: data.maxConsecutiveDays,
        requiresApproval: data.requiresApproval,
      },
      include: {
        leaveType: { select: { name: true, code: true } },
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_POLICY_CREATED",
      entityType: "LeavePolicy",
      entityId: policy.id,
      newValue: policy as unknown as import("@prisma/client").Prisma.InputJsonValue,
      reason: `Created policy for ${leaveType.name} — ${data.allocationDays} days`,
    });

    return NextResponse.json({ success: true, data: policy }, { status: 201 });
  } catch (error) {
    console.error("POST Leave Policy Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create leave policy" }, { status: 500 });
  }
}
