import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const assignmentSchema = z.object({
  moderatorId: z.string().min(1, "Moderator user ID is required"),
  unitId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
}).refine((data) => data.unitId || data.sectionId, {
  message: "Either unitId or sectionId must be specified for moderator assignment",
});

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN, UserRole.MODERATOR])) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const moderatorId = searchParams.get("moderatorId");

    const assignments = await prisma.moderatorAssignment.findMany({
      where: {
        moderatorId: moderatorId || (user.role === UserRole.MODERATOR ? user.id : undefined),
        isActive: true,
      },
      include: {
        moderator: {
          select: {
            id: true,
            email: true,
            personnel: { select: { fullName: true, rank: true, serviceId: true } },
          },
        },
        unit: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true, unitId: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    console.error("GET Moderator Assignments Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch assignments" }, { status: 500 });
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
    const result = assignmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { moderatorId, unitId, sectionId } = result.data;

    const targetUser = await prisma.user.findUnique({ where: { id: moderatorId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Moderator user not found" }, { status: 404 });
    }

    // Auto promote to MODERATOR role if USER
    if (targetUser.role === UserRole.USER) {
      await prisma.user.update({
        where: { id: moderatorId },
        data: { role: UserRole.MODERATOR },
      });
    }

    // Check if already assigned
    const existing = await prisma.moderatorAssignment.findFirst({
      where: {
        moderatorId,
        unitId: unitId || null,
        sectionId: sectionId || null,
        isActive: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "This moderator is already actively assigned to this unit/section" },
        { status: 409 }
      );
    }

    const assignment = await prisma.moderatorAssignment.create({
      data: {
        moderatorId,
        unitId: unitId || null,
        sectionId: sectionId || null,
      },
      include: {
        moderator: { select: { email: true } },
        unit: { select: { name: true, code: true } },
        section: { select: { name: true, code: true } },
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "MODERATOR_ASSIGNED",
      entityType: "ModeratorAssignment",
      entityId: assignment.id,
      newValue: assignment as unknown as import("@prisma/client").Prisma.InputJsonValue,
      reason: `Assigned moderator ${moderatorId} to ${unitId || sectionId}`,
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    console.error("POST Assignment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to assign moderator" }, { status: 500 });
  }
}
