import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

/**
 * Hard-delete a user account.
 *
 * Regular admins: users who have created/applied leave requests, written
 * reviews/approvals, created events or adjusted balances cannot be deleted
 * (their history must be preserved for the audit trail) — those should be
 * disabled instead.
 *
 * Super admin (SUPER_ADMIN_EMAIL in .env): can remove ANY account, including
 * accounts with activity. Their authored leave requests, reviews, approvals,
 * events and balance adjustments are removed in one transaction first.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const superAdmin = isSuperAdmin(user.email);
    const targetIsSuperAdmin = isSuperAdmin(existing.email);

    if (existing.id === user.id) {
      return NextResponse.json({ success: false, error: "You cannot delete your own account" }, { status: 400 });
    }

    // Only the super admin can remove the super admin account
    if (targetIsSuperAdmin && !superAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: only the super admin can delete this account" }, { status: 403 });
    }

    // Never allow deleting the last active admin (unless the super admin acts)
    if (!superAdmin && existing.role === UserRole.ADMIN && existing.status === "ACTIVE") {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: UserRole.ADMIN, status: "ACTIVE", id: { not: id } },
      });
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { success: false, error: "Cannot delete the last active admin. Promote another admin first." },
          { status: 400 }
        );
      }
    }

    // Activity that must be preserved
    const [requestsCreated, requestsApplied, reviews, approvals, events, adjustments] =
      await Promise.all([
        prisma.leaveRequest.count({ where: { createdById: id } }),
        prisma.leaveRequest.count({ where: { applicantId: id } }),
        prisma.leaveReview.count({ where: { reviewerId: id } }),
        prisma.leaveApproval.count({ where: { approverId: id } }),
        prisma.event.count({ where: { createdById: id } }),
        prisma.leaveBalanceAdjustment.count({ where: { createdById: id } }),
      ]);

    const activity = [
      ["leave requests created", requestsCreated],
      ["leave applications", requestsApplied],
      ["reviews", reviews],
      ["approvals", approvals],
      ["events", events],
      ["balance adjustments", adjustments],
    ].filter(([, n]) => (n as number) > 0);

    if (activity.length > 0 && !superAdmin) {
      const detail = activity.map(([label, n]) => `${n} ${label}`).join(", ");
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete: this account has ${detail}. History must be kept — disable the account instead.`,
        },
        { status: 400 }
      );
    }

    // Super admin deletions also remove the user's authored data so the
    // delete never fails on foreign keys.
    if (superAdmin) {
      if (requestsCreated > 0) {
        await prisma.leaveRequest.deleteMany({ where: { createdById: id } });
      }
      if (requestsApplied > 0) {
        await prisma.leaveRequest.deleteMany({ where: { applicantId: id } });
      }
      if (reviews > 0) {
        await prisma.leaveReview.deleteMany({ where: { reviewerId: id } });
      }
      if (approvals > 0) {
        await prisma.leaveApproval.deleteMany({ where: { approverId: id } });
      }
      if (events > 0) {
        await prisma.event.deleteMany({ where: { createdById: id } });
      }
      if (adjustments > 0) {
        await prisma.leaveBalanceAdjustment.deleteMany({ where: { createdById: id } });
      }
    }

    // Unlink any personnel record, then delete the user. Other relations
    // (sessions, tokens, moderator assignments, recipient notifications) are
    // cascaded by the schema; audit log actor becomes null.
    await prisma.$transaction([
      prisma.personnel.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.user.delete({ where: { id } }),
    ]);

    await createAuditLog({
      actorId: user.id,
      action: targetIsSuperAdmin || superAdmin ? "USER_DELETED_BY_SUPER_ADMIN" : "USER_DELETED",
      entityType: "User",
      entityId: id,
      oldValue: { email: existing.email, role: existing.role },
      reason: superAdmin
        ? "Super admin permanently deleted user account (including authored data)"
        : "Admin permanently deleted user account",
    });

    return NextResponse.json({
      success: true,
      data: { id, email: existing.email, deleted: true },
    });
  } catch (error) {
    console.error("DELETE User (hard) Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
  }
}
