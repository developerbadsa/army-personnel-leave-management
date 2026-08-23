import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, Prisma } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ personnelId: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { personnelId } = await params;

    const personnel = await prisma.personnel.findUnique({
      where: { id: personnelId },
      include: {
        unit: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, email: true } },
      },
    });

    if (!personnel) {
      return NextResponse.json({ success: false, error: "Personnel not found" }, { status: 404 });
    }

    // Authorization
    if (user.role === UserRole.USER && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, personnel) && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);

    const [leaveRequests, balances] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: {
          personnelId,
          startDate: { gte: new Date(year, 0, 1) },
          endDate: { lte: new Date(year, 11, 31) },
        },
        include: {
          leaveType: { select: { name: true, code: true } },
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.leaveBalance.findMany({
        where: { personnelId, year },
        include: { leaveType: true },
      }),
    ]);

    const summary = {
      totalRequests: leaveRequests.length,
      approved: leaveRequests.filter((r) => ["APPROVED", "ON_LEAVE", "COMPLETED"].includes(r.status)).length,
      pending: leaveRequests.filter((r) => ["PENDING_REVIEW", "UNDER_REVIEW", "PENDING_FINAL_APPROVAL"].includes(r.status)).length,
      rejected: leaveRequests.filter((r) => r.status === "REJECTED").length,
      cancelled: leaveRequests.filter((r) => r.status === "CANCELLED").length,
      totalDaysConsumed: leaveRequests
        .filter((r) => ["APPROVED", "ON_LEAVE", "COMPLETED"].includes(r.status))
        .reduce((sum, r) => sum + Number(r.totalDays), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        personnel: {
          id: personnel.id,
          serviceId: personnel.serviceId,
          fullName: personnel.fullName,
          rank: personnel.rank,
          unit: personnel.unit,
          section: personnel.section,
        },
        year,
        summary,
        balances: balances.map((b) => ({
          leaveType: b.leaveType,
          allocated: Number(b.allocatedDays),
          used: Number(b.usedDays),
          reserved: Number(b.reservedDays),
          remaining: Math.max(0, Number(b.allocatedDays) + Number(b.carryForward) + Number(b.adjustmentDays) - Number(b.usedDays) - Number(b.reservedDays)),
        })),
        leaveRequests: leaveRequests.map((r) => ({
          requestNumber: r.requestNumber,
          leaveType: r.leaveType,
          startDate: r.startDate,
          endDate: r.endDate,
          totalDays: Number(r.totalDays),
          status: r.status,
          reason: r.reason,
        })),
      },
    });
  } catch (error) {
    console.error("GET Individual Report Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate individual report" }, { status: 500 });
  }
}
