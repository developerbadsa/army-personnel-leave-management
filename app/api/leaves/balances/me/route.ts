import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!user.personnel?.id) {
      return NextResponse.json({ success: false, error: "No personnel record linked to your account" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);
    const personnelId = user.personnel.id;

    const activeLeaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });
    const balanceRecords = await prisma.leaveBalance.findMany({
      where: { personnelId, year },
      include: { leaveType: true },
    });

    // Auto-create missing balance records
    const existingTypeIds = new Set(balanceRecords.map((b) => b.leaveTypeId));
    const missingTypes = activeLeaveTypes.filter((t) => !existingTypeIds.has(t.id));

    if (missingTypes.length > 0) {
      for (const lt of missingTypes) {
        const created = await prisma.leaveBalance.create({
          data: {
            personnelId,
            leaveTypeId: lt.id,
            year,
            allocatedDays: lt.defaultAllowance ?? 0,
          },
          include: { leaveType: true },
        });
        balanceRecords.push(created);
      }
    }

    const formatted = balanceRecords.map((b) => {
      const allocated = Number(b.allocatedDays);
      const carry = Number(b.carryForward);
      const adjustments = Number(b.adjustmentDays);
      const used = Number(b.usedDays);
      const reserved = Number(b.reservedDays);
      const remaining = allocated + carry + adjustments - used - reserved;

      return {
        id: b.id,
        leaveType: b.leaveType,
        year: b.year,
        allocatedDays: allocated,
        carryForward: carry,
        adjustmentDays: adjustments,
        usedDays: used,
        reservedDays: reserved,
        remainingDays: Math.max(0, remaining),
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("GET My Balances Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch your leave balances" }, { status: 500 });
  }
}
