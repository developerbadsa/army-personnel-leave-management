import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as LeaveRequestStatus | null;
    const leaveTypeId = searchParams.get("leaveTypeId");
    const unitId = searchParams.get("unitId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveRequestWhereInput = {};

    // Role-based visibility
    if (user.role === UserRole.USER) {
      where.applicantId = user.id;
    } else if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      where.OR = [
        { personnel: { unitId: { in: scope.unitIds } } },
        { personnel: { sectionId: { in: scope.sectionIds } } },
        { applicantId: user.id },
      ];
    }

    if (status) where.status = status;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (unitId) {
      where.personnel = { unitId };
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { requestNumber: { contains: search, mode: "insensitive" } },
            { personnel: { fullName: { contains: search, mode: "insensitive" } } },
            { personnel: { serviceId: { contains: search, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const [total, leaves] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          personnel: {
            include: {
              unit: { select: { id: true, name: true, code: true } },
              section: { select: { id: true, name: true, code: true } },
            },
          },
          leaveType: true,
          reviews: {
            include: { reviewer: { select: { id: true, email: true, role: true } } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          approvals: {
            include: { approver: { select: { id: true, email: true, approvalAuthority: true } } },
            orderBy: { approvedAt: "desc" },
            take: 1,
          },
          returnRecord: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: leaves,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Leaves Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave requests" }, { status: 500 });
  }
}
