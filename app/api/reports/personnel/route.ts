import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, PersonnelStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN, UserRole.MODERATOR])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or Moderator required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status") as PersonnelStatus | null;

    const where: Prisma.PersonnelWhereInput = {};

    if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      where.OR = [
        { unitId: { in: scope.unitIds } },
        { sectionId: { in: scope.sectionIds } },
      ];
    }

    if (unitId) where.unitId = unitId;
    if (sectionId) where.sectionId = sectionId;
    if (status) where.status = status;

    const [personnelList, totalCount, statusCounts, rankCounts, unitCounts] = await Promise.all([
      prisma.personnel.findMany({
        where,
        include: {
          unit: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true, code: true } },
          user: { select: { role: true, approvalAuthority: true, status: true } },
        },
        orderBy: [{ unit: { name: "asc" } }, { fullName: "asc" }],
      }),
      prisma.personnel.count({ where }),
      prisma.personnel.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
      prisma.personnel.groupBy({
        by: ["rank"],
        where,
        _count: { id: true },
      }),
      prisma.personnel.groupBy({
        by: ["unitId"],
        where,
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPersonnel: totalCount,
          byStatus: statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
          byRank: rankCounts.reduce((acc, curr) => {
            acc[curr.rank] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
        },
        records: personnelList,
      },
    });
  } catch (error) {
    console.error("GET Personnel Report Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate personnel report" }, { status: 500 });
  }
}
