import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        personnel: {
          include: {
            unit: true,
            section: true,
            user: { select: { id: true, email: true, role: true } },
          },
        },
        leaveType: true,
        attachments: true,
        reviews: {
          include: { reviewer: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        approvals: {
          include: { approver: { select: { id: true, email: true, approvalAuthority: true } } },
          orderBy: { approvedAt: "asc" },
        },
        returnRecord: {
          include: { markedReturnedBy: { select: { id: true, email: true } } },
        },
        createdBy: { select: { id: true, email: true, role: true } },
        applicant: { select: { id: true, email: true } },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    // Authorization checks
    if (user.role === UserRole.USER && leaveRequest.applicantId !== user.id && leaveRequest.personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only view your own requests" }, { status: 403 });
    }

    if (
      user.role === UserRole.MODERATOR &&
      !canModeratorAccessPersonnel(user, leaveRequest.personnel) &&
      leaveRequest.applicantId !== user.id
    ) {
      return NextResponse.json({ success: false, error: "Forbidden: Leave request is outside your assigned scope" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error("GET Leave Details Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave details" }, { status: 500 });
  }
}
