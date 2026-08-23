import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN, UserRole.MODERATOR])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or Moderator required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);

    const units = await prisma.unit.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { personnel: true } },
      },
      orderBy: { name: "asc" },
    });

    const unitReports = await Promise.all(
      units.map(async (unit) => {
        const personnel = await prisma.personnel.findMany({
          where: { unitId: unit.id, status: "ACTIVE" },
          include: {
            leaveRequests: {
              where: {
                startDate: { gte: new Date(year, 0, 1) },
                endDate: { lte: new Date(year, 11, 31) },
                status: { notIn: ["REJECTED", "CANCELLED"] },
              },
              select: {
                totalDays: true,
                status: true,
              },
            },
          },

        });

        let totalLeaveDays = 0;
        let approvedDays = 0;
        let pendingDays = 0;

        for (const p of personnel) {
          for (const lr of p.leaveRequests) {
            const days = Number(lr.totalDays);
            totalLeaveDays += days;
            if (["APPROVED", "ON_LEAVE", "COMPLETED"].includes(lr.status)) {
              approvedDays += days;
            } else {
              pendingDays += days;
            }
          }
        }

        return {
          unit: { id: unit.id, name: unit.name, code: unit.code },
          personnelCount: unit._count.personnel,
          activeCount: personnel.length,
          leaveSummary: {
            totalLeaveDays,
            approvedDays,
            pendingDays,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        year,
        units: unitReports,
      },
    });
  } catch (error) {
    console.error("GET Unit-wise Report Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate unit-wise report" }, { status: 500 });
  }
}
