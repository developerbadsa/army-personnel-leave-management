import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN, UserRole.MODERATOR])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or Moderator required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    const now = new Date();

    const where: Prisma.LeaveReturnWhereInput = {
      actualReturnDate: null,
      expectedReturnDate: { lt: now },
    };

    const personnelWhere: Prisma.PersonnelWhereInput = {};
    if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      personnelWhere.OR = [
        { unitId: { in: scope.unitIds } },
        { sectionId: { in: scope.sectionIds } },
      ];
    }
    if (unitId) personnelWhere.unitId = unitId;
    if (Object.keys(personnelWhere).length > 0) where.personnel = personnelWhere;

    const overdueReturns = await prisma.leaveReturn.findMany({
      where,
      include: {
        personnel: {
          include: {
            unit: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
          },
        },
        leaveRequest: {
          include: { leaveType: { select: { name: true, code: true } } },
        },
      },
      orderBy: { expectedReturnDate: "asc" },
    });

    const formatted = overdueReturns.map((r) => ({
      ...r,
      daysOverdue: Math.ceil(
        (now.getTime() - new Date(r.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOverdue: formatted.length,
        },
        records: formatted,
      },
    });
  } catch (error) {
    console.error("GET Overdue Report Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate overdue report" }, { status: 500 });
  }
}
