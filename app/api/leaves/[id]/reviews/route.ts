import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    const reviews = await prisma.leaveReview.findMany({
      where: { leaveRequestId: id },
      include: {
        reviewer: {
          select: {
            id: true,
            email: true,
            role: true,
            personnel: { select: { fullName: true, rank: true, serviceId: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error("GET Leave Reviews Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch review history" }, { status: 500 });
  }
}
