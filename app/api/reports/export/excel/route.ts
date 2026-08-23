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
    if (unitId) personnelWhere.unitId = unitId;
    if (sectionId) personnelWhere.sectionId = sectionId;
    if (Object.keys(personnelWhere).length > 0) where.personnel = personnelWhere;

    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate) };
      where.endDate = { lte: new Date(endDate) };
    }

    const leaves = await prisma.leaveRequest.findMany({
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
    });

    // Generate CSV content
    const headers = [
      "Request Number",
      "Personnel Name",
      "Service ID",
      "Rank",
      "Unit",
      "Section",
      "Leave Type",
      "Start Date",
      "End Date",
      "Total Days",
      "Status",
      "Reason",
      "Submitted At",
    ];

    const rows = leaves.map((l) => [
      l.requestNumber,
      l.personnel.fullName,
      l.personnel.serviceId,
      l.personnel.rank,
      l.personnel.unit.name,
      l.personnel.section?.name || "N/A",
      l.leaveType.name,
      new Date(l.startDate).toISOString().split("T")[0],
      new Date(l.endDate).toISOString().split("T")[0],
      String(Number(l.totalDays)),
      l.status,
      `"${l.reason.replace(/"/g, '""')}"`,
      l.submittedAt ? new Date(l.submittedAt).toISOString().split("T")[0] : "N/A",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leave-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET Excel Export Error:", error);
    return NextResponse.json({ success: false, error: "Failed to export report" }, { status: 500 });
  }
}
