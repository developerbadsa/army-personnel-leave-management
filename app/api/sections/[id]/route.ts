import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSectionSchema = z.object({
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
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        unit: true,
        _count: {
          select: { personnel: true, assignments: true },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: section });
  } catch (error) {
    console.error("GET Section Details Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch section" }, { status: 500 });
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
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updateSectionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.section.update({
      where: { id },
      data: result.data,
    });

    await createAuditLog({
      actorId: user.id,
      action: "SECTION_UPDATED",
      entityType: "Section",
      entityId: id,
      oldValue: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValue: updated as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT Section Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update section" }, { status: 500 });
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
    const count = await prisma.personnel.count({ where: { sectionId: id } });
    if (count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete section with ${count} assigned personnel. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    const deleted = await prisma.section.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      action: "SECTION_DELETED",
      entityType: "Section",
      entityId: id,
      oldValue: deleted as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, message: "Section deleted successfully" });
  } catch (error) {
    console.error("DELETE Section Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete section" }, { status: 500 });
  }
}
