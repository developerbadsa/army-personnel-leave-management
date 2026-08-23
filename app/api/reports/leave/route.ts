import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN, UserRole.MODERATOR])) {
      return NextResponse.json({ success: false, error: "Forbidden: Reports require Admin or Moderator access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    const sectionId = searchParams.get("sectionId");
    const leaveTypeId = searchParams.get("leaveTypeId");
    const status = searchParams.get("status") as LeaveRequestStatus | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.LeaveRequestWhereInput = {};

    const personnelWhere: Prisma.PersonnelWhereInput = {};

    if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      personnelWhere.OR = [
        { unitId: { in: scope.unitIds } },
        { sectionId: { in: scope.sectionIds } },
      ];
    }

    if (unitId) {
      personnelWhere.unitId = unitId;
    }
    if (sectionId) {
      personnelWhere.sectionId = sectionId;
    }

    if (Object.keys(personnelWhere).length > 0) {
      where.personnel = personnelWhere;
    }
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (status) where.status = status;

    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate) };
      where.endDate = { lte: new Date(endDate) };
    }

    const [requests, totalCount, statusCounts] = await Promise.all([
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
          approvals: {
            orderBy: { approvedAt: "desc" },
            take: 1,
            include: { approver: { select: { email: true } } },
          },
        },
        orderBy: { startDate: "desc" },
      }),
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
    ]);

    const totalDaysConsumed = requests
      .filter((r) => r.status === LeaveRequestStatus.APPROVED || r.status === LeaveRequestStatus.COMPLETED)
      .reduce((sum, r) => sum + Number(r.totalDays), 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCount,
          totalApprovedDays: totalDaysConsumed,
          statusBreakdown: statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
        },
        records: requests,
      },
    });
  } catch (error) {
    console.error("GET Leave Report Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate leave report" }, { status: 500 });
  }
}
