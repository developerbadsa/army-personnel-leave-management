import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endStr = searchParams.get("end") || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

    const start = new Date(startStr);
    const end = new Date(endStr);

    const leaveWhere: Prisma.LeaveRequestWhereInput = {
      status: LeaveRequestStatus.APPROVED,
      startDate: { lte: end },
      endDate: { gte: start },
    };

    if (user.role === UserRole.USER) {
      leaveWhere.applicantId = user.id;
    } else if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      leaveWhere.OR = [
        { personnel: { unitId: { in: scope.unitIds } } },
        { personnel: { sectionId: { in: scope.sectionIds } } },
        { applicantId: user.id },
      ];
    }

    const [leaves, events] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: {
          personnel: {
            select: {
              fullName: true,
              rank: true,
              unit: { select: { name: true } },
            },
          },
          leaveType: { select: { name: true, code: true } },
        },
      }),
      prisma.event.findMany({
        where: {
          isPublished: true,
          startAt: { lte: end },
          endAt: { gte: start },
        },
      }),
    ]);

    const calendarItems = [
      ...leaves.map((l) => ({
        id: `leave-${l.id}`,
        type: "LEAVE",
        title: `${l.personnel.rank} ${l.personnel.fullName} (${l.leaveType.name})`,
        start: l.startDate,
        end: l.endDate,
        allDay: true,
        details: {
          requestNumber: l.requestNumber,
          unitName: l.personnel.unit.name,
          totalDays: l.totalDays,
        },
      })),
      ...events.map((e) => ({
        id: `event-${e.id}`,
        type: "EVENT",
        title: `[${e.type}] ${e.title}`,
        start: e.startAt,
        end: e.endAt,
        allDay: false,
        details: {
          location: e.location,
          description: e.description,
        },
      })),
    ];

    return NextResponse.json({ success: true, data: calendarItems });
  } catch (error) {
    console.error("GET Calendar Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch calendar data" }, { status: 500 });
  }
}
