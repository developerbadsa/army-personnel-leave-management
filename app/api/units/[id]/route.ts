import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateUnitSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).toUpperCase().optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            personnel: true,
            assignments: { where: { isActive: true } },
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ success: false, error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error("GET Unit Details Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch unit details" }, { status: 500 });
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
    const existing = await prisma.unit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Unit not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updateUnitSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.unit.update({
      where: { id },
      data: result.data,
    });

    await createAuditLog({
      actorId: user.id,
      action: "UNIT_UPDATED",
      entityType: "Unit",
      entityId: id,
      oldValue: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValue: updated as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT Unit Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update unit" }, { status: 500 });
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
    const personnelCount = await prisma.personnel.count({ where: { unitId: id } });
    if (personnelCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete unit with ${personnelCount} assigned personnel. Deactivate the unit instead.`,
        },
        { status: 400 }
      );
    }

    const deleted = await prisma.unit.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      action: "UNIT_DELETED",
      entityType: "Unit",
      entityId: id,
      oldValue: deleted as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, message: "Unit deleted successfully" });
  } catch (error) {
    console.error("DELETE Unit Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete unit" }, { status: 500 });
  }
}
