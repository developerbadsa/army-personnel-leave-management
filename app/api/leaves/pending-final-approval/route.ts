import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasApprovalAuthority, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, ApprovalAuthority, LeaveRequestStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const isAuthority = hasApprovalAuthority(user, [
      ApprovalAuthority.COMMANDER,
      ApprovalAuthority.QUARTER_MASTER,
    ]);
    const isAdmin = hasRole(user, [UserRole.ADMIN]);

    if (!isAuthority && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Commander, Quarter Master, or Admin can view" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = (page - 1) * limit;

    const where = { status: LeaveRequestStatus.PENDING_FINAL_APPROVAL };

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
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { reviewer: { select: { email: true, personnel: { select: { fullName: true } } } } },
          },
        },
        orderBy: { recommendedAt: "asc" },
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
    console.error("GET Pending Final Approval Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch pending approvals" }, { status: 500 });
  }
}
