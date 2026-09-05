import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { UserRole, ApprovalAuthority } from "@prisma/client";

export type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export async function authenticateRequest(): Promise<
  { user: AuthenticatedUser; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to proceed" },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

export function hasRole(user: AuthenticatedUser, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Super admin is a single account configured via SUPER_ADMIN_EMAIL in .env.
 * It bypasses the usual deletion safeguards so it can remove any account.
 */
export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const configured = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configured) && email.trim().toLowerCase() === configured;
}

export function hasApprovalAuthority(
  user: AuthenticatedUser,
  allowedAuthorities: ApprovalAuthority[]
): boolean {
  return allowedAuthorities.includes(user.approvalAuthority);
}

export function getModeratorScope(user: AuthenticatedUser): {
  unitIds: string[];
  sectionIds: string[];
} {
  const unitIds: string[] = [];
  const sectionIds: string[] = [];

  for (const assignment of user.assignedModerators) {
    if (assignment.unitId && !unitIds.includes(assignment.unitId)) {
      unitIds.push(assignment.unitId);
    }
    if (assignment.sectionId && !sectionIds.includes(assignment.sectionId)) {
      sectionIds.push(assignment.sectionId);
    }
  }

  return { unitIds, sectionIds };
}

export function canModeratorAccessPersonnel(
  user: AuthenticatedUser,
  personnel: { unitId: string; sectionId?: string | null }
): boolean {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role !== UserRole.MODERATOR) return false;

  const { unitIds, sectionIds } = getModeratorScope(user);

  if (unitIds.includes(personnel.unitId)) return true;
  if (personnel.sectionId && sectionIds.includes(personnel.sectionId)) return true;

  return false;
}
