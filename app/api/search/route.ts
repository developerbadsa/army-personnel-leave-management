import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, LeaveRequestStatus, Prisma } from "@prisma/client";

const SEARCH_TAKE = 8;

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const type = searchParams.get("type") || "all"; // all | personnel | users | leaves
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD
    const status = searchParams.get("status"); // comma-separated LeaveRequestStatus values

    const wantPersonnel = type === "all" || type === "personnel";
    const wantUsers = type === "all" || type === "users";
    const wantLeaves = type === "all" || type === "leaves";

    // Guards: if there is nothing meaningful to search by, don't dump the whole DB.
    const hasQuery = q.length > 0;
    const hasLeaveFilters = Boolean(from || to || status);
    const emptyResult = {
      success: true,
      data: { personnel: [], users: [], leaves: [], totals: { personnel: 0, users: 0, leaves: 0 } },
    };
    if (!hasQuery && !hasLeaveFilters) {
      return NextResponse.json(emptyResult);
    }

    // Inclusive date range (applied to leave start/end overlap).
    let startFilter: Date | undefined;
    let endFilter: Date | undefined;
    if (from) {
      const d = new Date(`${from}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) startFilter = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(d.getTime())) endFilter = d;
    }

    const statuses: LeaveRequestStatus[] = status
      ? status
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s): s is LeaveRequestStatus =>
            Object.values(LeaveRequestStatus).includes(s as LeaveRequestStatus)
          )
      : [];

    // ---- Role-based visibility scope ----
    let personnelScope: Prisma.PersonnelWhereInput = {};
    let userScope: Prisma.UserWhereInput = {};
    let leaveScope: Prisma.LeaveRequestWhereInput = {};

    if (user.role === UserRole.USER) {
      personnelScope = { userId: user.id };
      userScope = { id: user.id };
      leaveScope = { applicantId: user.id };
    } else if (user.role === UserRole.MODERATOR) {
      const scope = getModeratorScope(user);
      const scopedPersonnel: Prisma.PersonnelWhereInput = {
        OR: [
          { unitId: { in: scope.unitIds } },
          { sectionId: { in: scope.sectionIds } },
          { userId: user.id },
        ],
      };
      personnelScope = scopedPersonnel;
      leaveScope = {
        OR: [
          { personnel: { unitId: { in: scope.unitIds } } },
          { personnel: { sectionId: { in: scope.sectionIds } } },
          { applicantId: user.id },
        ],
      };
      userScope = {
        OR: [{ personnel: scopedPersonnel }, { id: user.id }],
      };
    }

    // ---- Personnel search ----
    let personnel: unknown[] = [];
    let personnelTotal = 0;
    if (wantPersonnel) {
      const and: Prisma.PersonnelWhereInput[] = [];
      if (hasQuery) {
        and.push({
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { serviceId: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { unit: { name: { contains: q, mode: "insensitive" } } },
            { section: { name: { contains: q, mode: "insensitive" } } },
          ],
        });
      }
      const where: Prisma.PersonnelWhereInput = {
        ...personnelScope,
        ...(and.length ? { AND: and } : {}),
      };
      [personnelTotal, personnel] = await Promise.all([
        prisma.personnel.count({ where }),
        prisma.personnel.findMany({
          where,
          take: SEARCH_TAKE,
          select: {
            id: true,
            serviceId: true,
            fullName: true,
            phone: true,
            email: true,
            status: true,
            unit: { select: { name: true } },
            section: { select: { name: true } },
            user: { select: { email: true } },
          },
          orderBy: [{ unit: { name: "asc" } }, { fullName: "asc" }],
        }),
      ]);
    }

    // ---- User account search (scoped by role) ----
    let users: unknown[] = [];
    let usersTotal = 0;
    if (wantUsers) {
      const and: Prisma.UserWhereInput[] = [];
      if (hasQuery) {
        and.push({
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { personnel: { fullName: { contains: q, mode: "insensitive" } } },
            { personnel: { serviceId: { contains: q, mode: "insensitive" } } },
          ],
        });
      }
      const where: Prisma.UserWhereInput = {
        ...userScope,
        ...(and.length ? { AND: and } : {}),
      };
      [usersTotal, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          take: SEARCH_TAKE,
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            personnel: { select: { id: true, fullName: true, serviceId: true } },
          },
          orderBy: { email: "asc" },
        }),
      ]);
    }

    // ---- Leave request search ----
    let leaves: unknown[] = [];
    let leavesTotal = 0;
    if (wantLeaves) {
      const and: Prisma.LeaveRequestWhereInput[] = [];
      if (hasQuery) {
        and.push({
          OR: [
            { requestNumber: { contains: q, mode: "insensitive" } },
            { personnel: { fullName: { contains: q, mode: "insensitive" } } },
            { personnel: { serviceId: { contains: q, mode: "insensitive" } } },
          ],
        });
      }
      // A leave overlaps the chosen range when it starts on/before `to` and ends on/after `from`.
      if (endFilter) {
        and.push({ startDate: { lte: endFilter } });
      }
      if (startFilter) {
        and.push({ endDate: { gte: startFilter } });
      }
      if (statuses.length) {
        and.push({ status: { in: statuses } });
      }
      const where: Prisma.LeaveRequestWhereInput = {
        ...leaveScope,
        ...(and.length ? { AND: and } : {}),
      };
      [leavesTotal, leaves] = await Promise.all([
        prisma.leaveRequest.count({ where }),
        prisma.leaveRequest.findMany({
          where,
          take: SEARCH_TAKE,
          select: {
            id: true,
            requestNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            totalDays: true,
            leaveType: { select: { name: true } },
            personnel: { select: { id: true, fullName: true, serviceId: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        personnel,
        users,
        leaves,
        totals: { personnel: personnelTotal, users: usersTotal, leaves: leavesTotal },
      },
    });
  } catch (error) {
    console.error("GET Search Error:", error);
    return NextResponse.json({ success: false, error: "Failed to run search" }, { status: 500 });
  }
}
