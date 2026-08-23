import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const sectionSchema = z.object({
  unitId: z.string().min(1, "Unit ID is required"),
  name: z.string().min(2, "Section name must be at least 2 characters"),
  code: z.string().min(2, "Section code must be at least 2 characters").toUpperCase(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");

    const sections = await prisma.section.findMany({
      where: unitId ? { unitId } : undefined,
      include: {
        unit: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { personnel: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: sections });
  } catch (error) {
    console.error("GET Sections Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch sections" }, { status: 500 });
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
    const result = sectionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { unitId, name, code, description, isActive } = result.data;

    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) {
      return NextResponse.json({ success: false, error: "Parent unit not found" }, { status: 404 });
    }

    const existing = await prisma.section.findFirst({
      where: {
        unitId,
        OR: [{ code }, { name }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A section with this code or name already exists in this unit" },
        { status: 409 }
      );
    }

    const newSection = await prisma.section.create({
      data: { unitId, name, code, description, isActive },
    });

    await createAuditLog({
      actorId: user.id,
      action: "SECTION_CREATED",
      entityType: "Section",
      entityId: newSection.id,
      newValue: newSection as unknown as import("@prisma/client").Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, data: newSection }, { status: 201 });
  } catch (error) {
    console.error("POST Section Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create section" }, { status: 500 });
  }
}
