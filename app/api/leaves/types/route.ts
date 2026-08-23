import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const leaveTypeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(2, "Code is required").toUpperCase(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  requiresAttachment: z.boolean().optional().default(false),
  allowHalfDay: z.boolean().optional().default(false),
  allowBackdated: z.boolean().optional().default(false),
  defaultAllowance: z.number().nonnegative().optional().nullable(),
  minDays: z.number().positive().optional().nullable(),
  maxDays: z.number().positive().optional().nullable(),
});

export async function GET() {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const types = await prisma.leaveType.findMany({
      orderBy: { name: "asc" },
      include: {
        policies: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    console.error("GET Leave Types Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave types" }, { status: 500 });
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
    const result = leaveTypeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const existing = await prisma.leaveType.findFirst({
      where: { OR: [{ code: data.code }, { name: data.name }] },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Leave type with this code or name already exists" }, { status: 409 });
    }

    const newType = await prisma.leaveType.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        isActive: data.isActive,
        requiresAttachment: data.requiresAttachment,
        allowHalfDay: data.allowHalfDay,
        allowBackdated: data.allowBackdated,
        defaultAllowance: data.defaultAllowance,
        minDays: data.minDays,
        maxDays: data.maxDays,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "LEAVE_TYPE_CREATED",
      entityType: "LeaveType",
      entityId: newType.id,
      newValue: newType as unknown as import("@prisma/client").Prisma.InputJsonValue,
      reason: `Created leave type ${newType.name}`,
    });

    return NextResponse.json({ success: true, data: newType }, { status: 201 });
  } catch (error) {
    console.error("POST Leave Type Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create leave type" }, { status: 500 });
  }
}
