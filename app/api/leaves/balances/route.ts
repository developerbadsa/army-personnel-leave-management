import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, canModeratorAccessPersonnel, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const adjustBalanceSchema = z.object({
  personnelId: z.string().min(1, "Personnel ID is required"),
  leaveTypeId: z.string().min(1, "Leave Type ID is required"),
  year: z.number().int().default(new Date().getFullYear()),
  amount: z.number().refine((val) => val !== 0, "Adjustment amount cannot be zero"),
  reason: z.string().min(3, "Reason for adjustment is required"),
});

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const targetPersonnelId = searchParams.get("personnelId") || user.personnel?.id;
    const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);

    if (!targetPersonnelId) {
      return NextResponse.json({ success: false, error: "Personnel ID is required" }, { status: 400 });
    }

    const personnel = await prisma.personnel.findUnique({
      where: { id: targetPersonnelId },
      include: { user: true },
    });

    if (!personnel) {
      return NextResponse.json({ success: false, error: "Personnel not found" }, { status: 404 });
    }

    if (user.role === UserRole.USER && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only view your own balance" }, { status: 403 });
    }

    if (user.role === UserRole.MODERATOR && !canModeratorAccessPersonnel(user, personnel) && personnel.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: Outside your assigned scope" }, { status: 403 });
    }

    const activeLeaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
    });

    const balanceRecords = await prisma.leaveBalance.findMany({
      where: { personnelId: targetPersonnelId, year },
      include: {
        leaveType: true,
        adjustments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    // Auto-create missing balance records for active leave types if not yet initialized
    const existingTypeIds = new Set(balanceRecords.map((b) => b.leaveTypeId));
    const missingTypes = activeLeaveTypes.filter((t) => !existingTypeIds.has(t.id));

    if (missingTypes.length > 0) {
      for (const lt of missingTypes) {
        const created = await prisma.leaveBalance.create({
          data: {
            personnelId: targetPersonnelId,
            leaveTypeId: lt.id,
            year,
            allocatedDays: lt.defaultAllowance ?? 0,
            carryForward: 0,
            adjustmentDays: 0,
            usedDays: 0,
            reservedDays: 0,
          },
          include: { leaveType: true, adjustments: true },
        });
        balanceRecords.push(created);
      }
    }

    const formattedBalances = balanceRecords.map((b) => {
      const allocated = Number(b.allocatedDays);
      const carry = Number(b.carryForward);
      const adjustments = Number(b.adjustmentDays);
      const used = Number(b.usedDays);
      const reserved = Number(b.reservedDays);
      const remaining = allocated + carry + adjustments - used - reserved;

      return {
        id: b.id,
        personnelId: b.personnelId,
        leaveTypeId: b.leaveTypeId,
        leaveType: b.leaveType,
        year: b.year,
        allocatedDays: allocated,
        carryForward: carry,
        adjustmentDays: adjustments,
        usedDays: used,
        reservedDays: reserved,
        remainingDays: Math.max(0, remaining),
        adjustments: b.adjustments,
      };
    });

    return NextResponse.json({ success: true, data: formattedBalances });
  } catch (error) {
    console.error("GET Leave Balances Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch leave balances" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const result = adjustBalanceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { personnelId, leaveTypeId, year, amount, reason } = result.data;

    let balance = await prisma.leaveBalance.findUnique({
      where: {
        personnelId_leaveTypeId_year: { personnelId, leaveTypeId, year },
      },
    });

    if (!balance) {
      const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
      balance = await prisma.leaveBalance.create({
        data: {
          personnelId,
          leaveTypeId,
          year,
          allocatedDays: leaveType?.defaultAllowance ?? 0,
        },
      });
    }

    const newAdjustmentTotal = new Prisma.Decimal(balance.adjustmentDays).plus(amount);

    const [updatedBalance, adjustmentEntry] = await prisma.$transaction([
      prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { adjustmentDays: newAdjustmentTotal },
      }),
      prisma.leaveBalanceAdjustment.create({
        data: {
          balanceId: balance.id,
          amount,
          reason,
          createdById: user.id,
        },
      }),
    ]);

    await createAuditLog({
      actorId: user.id,
      action: "BALANCE_ADJUSTED",
      entityType: "LeaveBalance",
      entityId: balance.id,
      oldValue: { previousAdjustment: balance.adjustmentDays },
      newValue: { newAdjustment: newAdjustmentTotal, amount, reason },
      reason,
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: updatedBalance,
        adjustment: adjustmentEntry,
      },
    });
  } catch (error) {
    console.error("POST Balance Adjustment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to adjust balance" }, { status: 500 });
  }
}
