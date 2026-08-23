import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const initializeSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  unitId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const result = initializeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { year, unitId } = result.data;

    // Get active leave types
    const leaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });
    if (leaveTypes.length === 0) {
      return NextResponse.json({ success: false, error: "No active leave types found" }, { status: 400 });
    }

    // Get all active personnel (optionally filtered by unit)
    const personnelWhere = { status: "ACTIVE" as const, ...(unitId ? { unitId } : {}) };
    const personnel = await prisma.personnel.findMany({ where: personnelWhere });

    if (personnel.length === 0) {
      return NextResponse.json({ success: false, error: "No active personnel found" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    for (const p of personnel) {
      for (const lt of leaveTypes) {
        try {
          const existing = await prisma.leaveBalance.findUnique({
            where: {
              personnelId_leaveTypeId_year: {
                personnelId: p.id,
                leaveTypeId: lt.id,
                year,
              },
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          await prisma.leaveBalance.create({
            data: {
              personnelId: p.id,
              leaveTypeId: lt.id,
              year,
              allocatedDays: lt.defaultAllowance ?? 0,
            },
          });
          created++;
        } catch {
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Initialized leave balances for year ${year}`,
      data: {
        year,
        personnelCount: personnel.length,
        leaveTypeCount: leaveTypes.length,
        balancesCreated: created,
        alreadyExisted: skipped,
      },
    });
  } catch (error) {
    console.error("Initialize Year Balances Error:", error);
    return NextResponse.json({ success: false, error: "Failed to initialize balances" }, { status: 500 });
  }
}
