import { NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  PersonnelStatus,
  LeaveRequestStatus,
  LeaveReturnStatus,
  Prisma,
} from "@prisma/client";

export async function GET() {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const now = new Date();

    if (user.role === UserRole.ADMIN) {
      const [
        totalPersonnel,
        activePersonnel,
        onLeavePersonnel,
        pendingReviewCount,
        awaitingFinalApprovalCount,
        overdueReturnsCount,
        upcomingEventsCount,
      ] = await Promise.all([
        prisma.personnel.count(),
        prisma.personnel.count({ where: { status: PersonnelStatus.ACTIVE } }),
        prisma.personnel.count({ where: { status: PersonnelStatus.ON_LEAVE } }),
        prisma.leaveRequest.count({
          where: {
            status: { in: [LeaveRequestStatus.PENDING_REVIEW, LeaveRequestStatus.UNDER_REVIEW] },
          },
        }),
        prisma.leaveRequest.count({
          where: { status: LeaveRequestStatus.PENDING_FINAL_APPROVAL },
        }),
        prisma.leaveReturn.count({
          where: {
            actualReturnDate: null,
            expectedReturnDate: { lt: now },
          },
        }),
        prisma.event.count({
          where: {
            isPublished: true,
            endAt: { gte: now },
          },
        }),
      ]);

      // Calculate Monthly Trends (Last 6 Months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const [recentLeaves, leaveTypes] = await Promise.all([
        prisma.leaveRequest.findMany({
          where: { startDate: { gte: sixMonthsAgo } },
          select: { startDate: true, totalDays: true, leaveTypeId: true, status: true },
        }),
        prisma.leaveType.findMany({
          select: { id: true, name: true, code: true },
        }),
      ]);

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const count = recentLeaves.filter(
          (l) => l.startDate.getMonth() === m && l.startDate.getFullYear() === y
        ).length;
        monthlyTrends.push({ month: `${monthNames[m]} ${y}`, count });
      }

      const leaveTypeMap = new Map(leaveTypes.map((t) => [t.id, t.name]));
      const distributionMap = new Map<string, number>();
      for (const l of recentLeaves) {
        const name = leaveTypeMap.get(l.leaveTypeId) || "Other";
        distributionMap.set(name, (distributionMap.get(name) || 0) + 1);
      }
      const leaveTypeDistribution = Array.from(distributionMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      return NextResponse.json({
        success: true,
        data: {
          role: "ADMIN",
          stats: {
            totalPersonnel,
            activePersonnel,
            onLeavePersonnel,
            pendingReviewCount,
            awaitingFinalApprovalCount,
            overdueReturnsCount,
            upcomingEventsCount,
            monthlyTrends,
            leaveTypeDistribution,
          },
        },
      });
    }

    if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      const personnelWhere: Prisma.PersonnelWhereInput = {
        OR: [
          { unitId: { in: scope.unitIds } },
          { sectionId: { in: scope.sectionIds } },
          { userId: user.id },
        ],
      };

      const [
        assignedPersonnelCount,
        pendingReviewCount,
        awaitingFinalApprovalCount,
        overdueReturnsCount,
      ] = await Promise.all([
        prisma.personnel.count({ where: personnelWhere }),
        prisma.leaveRequest.count({
          where: {
            personnel: personnelWhere,
            status: { in: [LeaveRequestStatus.PENDING_REVIEW, LeaveRequestStatus.UNDER_REVIEW] },
          },
        }),
        prisma.leaveRequest.count({
          where: {
            personnel: personnelWhere,
            status: LeaveRequestStatus.PENDING_FINAL_APPROVAL,
          },
        }),
        prisma.leaveReturn.count({
          where: {
            personnel: personnelWhere,
            actualReturnDate: null,
            expectedReturnDate: { lt: now },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          role: "MODERATOR",
          stats: {
            assignedPersonnelCount,
            pendingReviewCount,
            awaitingFinalApprovalCount,
            overdueReturnsCount,
          },
        },
      });
    }

    // USER role
    const currentYear = now.getFullYear();
    const [balances, recentRequests, unreadNotificationsCount] = await Promise.all([
      user.personnel?.id
        ? prisma.leaveBalance.findMany({
            where: { personnelId: user.personnel.id, year: currentYear },
            include: { leaveType: true },
          })
        : [],
      prisma.leaveRequest.findMany({
        where: { applicantId: user.id },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { leaveType: true },
      }),
      prisma.notification.count({
        where: { recipientId: user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        role: "USER",
        stats: {
          balances: balances.map((b) => ({
            leaveTypeName: b.leaveType.name,
            code: b.leaveType.code,
            remainingDays: Math.max(
              0,
              Number(b.allocatedDays) +
                Number(b.carryForward) +
                Number(b.adjustmentDays) -
                Number(b.usedDays) -
                Number(b.reservedDays)
            ),
          })),
          recentRequests,
          unreadNotificationsCount,
        },
      },
    });
  } catch (error) {
    console.error("GET Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
