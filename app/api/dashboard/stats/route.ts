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
