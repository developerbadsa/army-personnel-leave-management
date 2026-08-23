import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const unitSchema = z.object({
  name: z.string().min(2, "Unit name must be at least 2 characters"),
  code: z.string().min(2, "Unit code must be at least 2 characters").toUpperCase(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const units = await prisma.unit.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            sections: true,
            personnel: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: units });
  } catch (error) {
    console.error("GET Units Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch units" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin role required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = unitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, code, description, isActive } = result.data;

    const existingUnit = await prisma.unit.findFirst({
      where: {
        OR: [{ code }, { name }],
      },
    });

    if (existingUnit) {
      return NextResponse.json(
        { success: false, error: "A unit with this name or code already exists" },
        { status: 409 }
      );
    }

    const newUnit = await prisma.unit.create({
      data: { name, code, description, isActive },
    });

    await createAuditLog({
      actorId: user.id,
      action: "UNIT_CREATED",
      entityType: "Unit",
      entityId: newUnit.id,
      newValue: newUnit as unknown as import("@prisma/client").Prisma.InputJsonValue,
      reason: "Admin created new unit",
    });

    return NextResponse.json({ success: true, data: newUnit }, { status: 201 });
  } catch (error) {
    console.error("POST Unit Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create unit" }, { status: 500 });
  }
}
