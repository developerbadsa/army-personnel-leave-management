import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveReturnStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as LeaveReturnStatus | null;
    const unitId = searchParams.get("unitId");
    const isOverdueOnly = searchParams.get("overdue") === "true";

    const where: Prisma.LeaveReturnWhereInput = {};

    const personnelWhere: Prisma.PersonnelWhereInput = {};

    if (user.role === UserRole.USER) {
      personnelWhere.userId = user.id;
    } else if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      personnelWhere.OR = [
        { unitId: { in: scope.unitIds } },
        { sectionId: { in: scope.sectionIds } },
        { userId: user.id },
      ];
    }

    if (unitId) {
      personnelWhere.unitId = unitId;
    }

    if (Object.keys(personnelWhere).length > 0) {
      where.personnel = personnelWhere;
    }

    if (status) where.status = status;

    if (isOverdueOnly) {
      where.actualReturnDate = null;
      where.expectedReturnDate = { lt: new Date() };
    }

    const returns = await prisma.leaveReturn.findMany({
      where,
      include: {
        personnel: {
          include: {
            unit: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
          },
        },
        leaveRequest: {
          include: { leaveType: true },
        },
        markedReturnedBy: {
          select: { id: true, email: true },
        },
      },
      orderBy: { expectedReturnDate: "asc" },
    });

    const now = new Date();
    const formatted = returns.map((r) => {
      const isOverdue = !r.actualReturnDate && new Date(r.expectedReturnDate) < now;
      return {
        ...r,
        computedStatus: isOverdue ? LeaveReturnStatus.OVERDUE : r.status,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("GET Returns Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch returns" }, { status: 500 });
  }
}
