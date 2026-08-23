import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole, ApprovalAuthority, UserStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
  approvalAuthority: z.nativeEnum(ApprovalAuthority).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!hasRole(user, [UserRole.ADMIN]) && user.id !== id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        approvalAuthority: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        personnel: {
          include: {
            unit: true,
            section: true,
          },
        },
        assignedModerators: {
          where: { isActive: true },
          include: {
            unit: true,
            section: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: targetUser });
  } catch (error) {
    console.error("GET User Details Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch user details" }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await req.json();
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, role, approvalAuthority, status } = result.data;
    const updateData: {
      email?: string;
      passwordHash?: string;
      role?: UserRole;
      approvalAuthority?: ApprovalAuthority;
      status?: UserStatus;
    } = {};

    if (email) updateData.email = email.toLowerCase().trim();
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
    if (role) updateData.role = role;
    if (approvalAuthority) updateData.approvalAuthority = approvalAuthority;
    if (status) updateData.status = status;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        approvalAuthority: true,
        status: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: id,
      oldValue: { role: existing.role, authority: existing.approvalAuthority, status: existing.status },
      newValue: { role: updated.role, authority: updated.approvalAuthority, status: updated.status },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT User Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
