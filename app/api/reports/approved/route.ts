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
    const sectionId = searchParams.get("sectionId");
    const leaveTypeId = searchParams.get("leaveTypeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.LeaveRequestWhereInput = {
      status: { in: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.ON_LEAVE, LeaveRequestStatus.COMPLETED] },
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
    if (sectionId) personnelWhere.sectionId = sectionId;
    if (Object.keys(personnelWhere).length > 0) where.personnel = personnelWhere;

    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { lte: new Date(endDate) };

    const [requests, totalCount, totalDays] = await Promise.all([
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
        orderBy: { startDate: "desc" },
      }),
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.aggregate({ where, _sum: { totalDays: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCount,
          totalDaysApproved: Number(totalDays._sum.totalDays || 0),
        },
        records: requests,
      },
    });
  } catch (error) {
    console.error("GET Approved Report Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate approved report" }, { status: 500 });
  }
}
