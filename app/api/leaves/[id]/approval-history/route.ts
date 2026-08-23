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
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        personnel: { select: { fullName: true, serviceId: true, rank: true } },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    const [reviews, approvals] = await Promise.all([
      prisma.leaveReview.findMany({
        where: { leaveRequestId: id },
        include: {
          reviewer: {
            select: {
              id: true,
              email: true,
              personnel: { select: { fullName: true, rank: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.leaveApproval.findMany({
        where: { leaveRequestId: id },
        include: {
          approver: {
            select: {
              id: true,
              email: true,
              approvalAuthority: true,
              personnel: { select: { fullName: true, rank: true } },
            },
          },
        },
        orderBy: { approvedAt: "asc" },
      }),
    ]);

    // Build a unified timeline
    const timeline: Array<{
      type: "SUBMITTED" | "REVIEWED" | "APPROVED";
      date: Date;
      decision?: string;
      remarks?: string | null;
      actor: {
        id: string;
        email: string;
        fullName?: string;
        rank?: string;
        authority?: string;
        role?: string;
      };
    }> = [];

    // Submission event
    if (leaveRequest.submittedAt) {
      timeline.push({
        type: "SUBMITTED",
        date: leaveRequest.submittedAt,
        actor: {
          id: leaveRequest.createdById,
          email: "system",
        },
      });
    }

    // Reviews
    for (const r of reviews) {
      timeline.push({
        type: "REVIEWED",
        date: r.createdAt,
        decision: r.decision,
        remarks: r.remarks,
        actor: {
          id: r.reviewer.id,
          email: r.reviewer.email,
          fullName: r.reviewer.personnel?.fullName,
          rank: r.reviewer.personnel?.rank,
        },
      });
    }

    // Approvals
    for (const a of approvals) {
      timeline.push({
        type: "APPROVED",
        date: a.approvedAt,
        decision: a.decision,
        remarks: a.remarks,
        actor: {
          id: a.approver.id,
          email: a.approver.email,
          fullName: a.approver.personnel?.fullName,
          rank: a.approver.personnel?.rank,
          authority: a.authority,
        },
      });
    }

    // Sort by date
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        requestNumber: leaveRequest.requestNumber,
        status: leaveRequest.status,
        personnel: leaveRequest.personnel,
        timeline,
      },
    });
  } catch (error) {
    console.error("GET Approval History Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch approval history" }, { status: 500 });
  }
}
