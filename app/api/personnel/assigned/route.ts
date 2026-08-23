import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, PersonnelStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (user.role === UserRole.USER) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or Moderator required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const unitId = searchParams.get("unitId");
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status") as PersonnelStatus | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PersonnelWhereInput = {};

    // Moderator scope
    if (user.role === UserRole.MODERATOR) {
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
    console.error("GET Assigned Personnel Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch assigned personnel" }, { status: 500 });
  }
}
