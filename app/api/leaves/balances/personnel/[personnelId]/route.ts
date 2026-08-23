import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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
      include: { user: true },
    });

    if (!personnel) {
      return NextResponse.json({ success: false, error: "Personnel not found" }, { status: 404 });
    }

    // Authorization
    if (user.role === UserRole.USER && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only view your own balance" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, personnel) && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: Personnel outside your assigned scope" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);

    const activeLeaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });
    const balanceRecords = await prisma.leaveBalance.findMany({
      where: { personnelId, year },
      include: { leaveType: true },
    });

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

      return {
        id: b.id,
        leaveType: b.leaveType,
        year: b.year,
        allocatedDays: allocated,
        carryForward: carry,
        adjustmentDays: adjustments,
        usedDays: used,
        reservedDays: reserved,
        remainingDays: Math.max(0, allocated + carry + adjustments - used - reserved),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        personnel: {
          id: personnel.id,
          serviceId: personnel.serviceId,
          fullName: personnel.fullName,
          rank: personnel.rank,
        },
        balances: formatted,
      },
    });
  } catch (error) {
    console.error("GET Personnel Balances Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch personnel balances" }, { status: 500 });
  }
}
