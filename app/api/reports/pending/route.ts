import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN, UserRole.MODERATOR])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or Moderator required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    const leaveTypeId = searchParams.get("leaveTypeId");

    const where: Prisma.LeaveRequestWhereInput = {
      status: {
        in: [LeaveRequestStatus.PENDING_REVIEW, LeaveRequestStatus.UNDER_REVIEW, LeaveRequestStatus.PENDING_FINAL_APPROVAL],
      },
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
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;

    const [requests, totalCount, statusBreakdown] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          personnel: {
            include: {
              unit: { select: { name: true, code: true } },
              section: { select: { name: true, code: true } },
            },
          },
          leaveType: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCount,
          statusBreakdown: statusBreakdown.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
        },
        records: requests,
      },
    });
  } catch (error) {
    console.error("GET Pending Report Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate pending report" }, { status: 500 });
  }
}
