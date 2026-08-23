import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveReturnStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const now = new Date();

    const where: Prisma.LeaveReturnWhereInput = {
      actualReturnDate: null,
      expectedReturnDate: { lt: now },
    };

    // Role-based scope
    if (user.role === UserRole.USER) {
      where.personnel = { userId: user.id };
    } else if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      where.personnel = {
        OR: [
          { unitId: { in: scope.unitIds } },
          { sectionId: { in: scope.sectionIds } },
          { userId: user.id },
        ],
      };
    }

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
          include: { leaveType: true },
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

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("GET Overdue Returns Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch overdue returns" }, { status: 500 });
  }
}
