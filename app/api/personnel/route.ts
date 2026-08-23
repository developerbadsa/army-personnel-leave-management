import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, PersonnelStatus, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createPersonnelSchema = z.object({
  serviceId: z.string().min(2, "Service ID is required").toUpperCase(),
  fullName: z.string().min(2, "Full name is required"),
  rank: z.string().min(2, "Rank is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  postingDate: z.string().optional().nullable(),
  currentPosting: z.string().optional().nullable(),
  previousPosting: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  status: z.nativeEnum(PersonnelStatus).optional().default(PersonnelStatus.ACTIVE),
  unitId: z.string().min(1, "Unit is required"),
  sectionId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const unitId = searchParams.get("unitId");
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status") as PersonnelStatus | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PersonnelWhereInput = {};

    if (user.role === UserRole.USER) {
      where.userId = user.id;
    } else if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      where.OR = [
        { unitId: { in: scope.unitIds } },
        { sectionId: { in: scope.sectionIds } },
        { userId: user.id },
      ];
    }

    if (status) where.status = status;
    if (unitId) where.unitId = unitId;
    if (sectionId) where.sectionId = sectionId;

    if (search) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { serviceId: { contains: search, mode: "insensitive" } },
            { rank: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [total, personnel] = await Promise.all([
      prisma.personnel.count({ where }),
      prisma.personnel.findMany({
        where,
        skip,
        take: limit,
        include: {
          unit: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, email: true, role: true, approvalAuthority: true, status: true } },
        },
        orderBy: [{ unit: { name: "asc" } }, { fullName: "asc" }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: personnel,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Personnel Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch personnel" }, { status: 500 });
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
    const result = createPersonnelSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const existing = await prisma.personnel.findUnique({ where: { serviceId: data.serviceId } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Personnel with this Service ID already exists" }, { status: 409 });
    }

    const newPersonnel = await prisma.personnel.create({
      data: {
        serviceId: data.serviceId,
        fullName: data.fullName,
        rank: data.rank,
        phone: data.phone,
        email: data.email,
        bloodGroup: data.bloodGroup,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
        postingDate: data.postingDate ? new Date(data.postingDate) : null,
        currentPosting: data.currentPosting,
        previousPosting: data.previousPosting,
        supervisorName: data.supervisorName,
        status: data.status,
        unitId: data.unitId,
        sectionId: data.sectionId || null,
        userId: data.userId || null,
      },
      include: {
        unit: true,
        section: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "PERSONNEL_CREATED",
      entityType: "Personnel",
      entityId: newPersonnel.id,
      newValue: newPersonnel as unknown as Prisma.InputJsonValue,
      reason: `Created personnel record for ${newPersonnel.fullName} (${newPersonnel.serviceId})`,
    });

    return NextResponse.json({ success: true, data: newPersonnel }, { status: 201 });
  } catch (error) {
    console.error("POST Personnel Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create personnel" }, { status: 500 });
  }
}
