import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { UserStatus } from "@prisma/client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const cleanEmail = email.trim();
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
      include: {
        personnel: {
          include: {
            unit: true,
            section: true,
          },
        },
        assignedModerators: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status === UserStatus.DISABLED) {
      return NextResponse.json(
        { success: false, error: "Your account is disabled. Please contact an administrator." },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      approvalAuthority: user.approvalAuthority,
      personnelId: user.personnel?.id,
      serviceId: user.personnel?.serviceId,
      unitId: user.personnel?.unitId,
      sectionId: user.personnel?.sectionId,
    });

    // Audit Log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");
    await createAuditLog({
      actorId: user.id,
      action: "AUTH_LOGIN",
      entityType: "User",
      entityId: user.id,
      reason: "User logged in successfully",
      ipAddress: ip,
      userAgent: userAgent,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalAuthority: user.approvalAuthority,
        personnel: user.personnel,
        assignedModerators: user.assignedModerators,
      },
    });

    // Set HTTP-Only Cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
