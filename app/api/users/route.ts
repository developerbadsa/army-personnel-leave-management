import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole, ApprovalAuthority, UserStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(UserRole),
  approvalAuthority: z.nativeEnum(ApprovalAuthority).optional().default(ApprovalAuthority.NONE),
  status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
});

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") as UserRole | null;
    const authority = searchParams.get("approvalAuthority") as ApprovalAuthority | null;
    const status = searchParams.get("status") as UserStatus | null;
    const search = searchParams.get("search");

    const users = await prisma.user.findMany({
      where: {
        role: role || undefined,
        approvalAuthority: authority || undefined,
        status: status || undefined,
        OR: search
          ? [
              { email: { contains: search, mode: "insensitive" } },
              { personnel: { fullName: { contains: search, mode: "insensitive" } } },
              { personnel: { serviceId: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        approvalAuthority: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        personnel: {
          select: {
            id: true,
            serviceId: true,
            fullName: true,
            rank: true,
            unit: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
          },
        },
        assignedModerators: {
          where: { isActive: true },
          include: {
            unit: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("GET Users Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
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
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, role, approvalAuthority, status } = result.data;
    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ success: false, error: "A user with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        role,
        approvalAuthority,
        status,
      },
      select: {
        id: true,
        email: true,
        role: true,
        approvalAuthority: true,
        status: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser.id,
      newValue: newUser as unknown as import("@prisma/client").Prisma.InputJsonValue,
      reason: "Admin created new user",
    });

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    console.error("POST User Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
  }
}
