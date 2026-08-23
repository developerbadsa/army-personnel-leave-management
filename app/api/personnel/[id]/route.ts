import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, PersonnelStatus, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updatePersonnelSchema = z.object({
  fullName: z.string().min(2).optional(),
  rank: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  postingDate: z.string().optional().nullable(),
  currentPosting: z.string().optional().nullable(),
  previousPosting: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  status: z.nativeEnum(PersonnelStatus).optional(),
  unitId: z.string().optional(),
  sectionId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const personnel = await prisma.personnel.findUnique({
      where: { id },
      include: {
        unit: true,
        section: true,
        user: {
          select: { id: true, email: true, role: true, approvalAuthority: true, status: true, lastLoginAt: true },
        },
        leaveBalances: {
          where: { year: new Date().getFullYear() },
          include: { leaveType: true },
        },
        leaveRequests: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { leaveType: true },
        },
      },
    });

    if (!personnel) {
      return NextResponse.json({ success: false, error: "Personnel not found" }, { status: 404 });
    }

    if (user.role === UserRole.USER && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only view your own profile" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, personnel) && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: Personnel outside your assigned scope" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: personnel });
  } catch (error) {
    console.error("GET Personnel Profile Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
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
    const existing = await prisma.personnel.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Personnel not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updatePersonnelSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const updateData: Prisma.PersonnelUpdateInput = {
      ...data,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
      postingDate: data.postingDate ? new Date(data.postingDate) : undefined,
      unit: data.unitId ? { connect: { id: data.unitId } } : undefined,
      section: data.sectionId !== undefined ? (data.sectionId ? { connect: { id: data.sectionId } } : { disconnect: true }) : undefined,
      user: data.userId !== undefined ? (data.userId ? { connect: { id: data.userId } } : { disconnect: true }) : undefined,
    };
    delete (updateData as Record<string, unknown>).unitId;
    delete (updateData as Record<string, unknown>).sectionId;
    delete (updateData as Record<string, unknown>).userId;

    const updated = await prisma.personnel.update({
      where: { id },
      data: updateData,
      include: { unit: true, section: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: "PERSONNEL_UPDATED",
      entityType: "Personnel",
      entityId: id,
      oldValue: existing as unknown as Prisma.InputJsonValue,
      newValue: updated as unknown as Prisma.InputJsonValue,
      reason: "Admin updated personnel record",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT Personnel Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update personnel" }, { status: 500 });
  }
}
