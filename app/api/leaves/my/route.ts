import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { LeaveRequestStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as LeaveRequestStatus | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveRequestWhereInput = {
      OR: [
        { applicantId: user.id },
        { createdById: user.id },
      ],
    };

    if (status) where.status = status;

    const [total, leaves] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          leaveType: true,
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          approvals: {
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
    console.error("GET My Leaves Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch your leave requests" }, { status: 500 });
  }
}
