import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate a random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Invalidate any existing reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new reset token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // In production, send email with reset link containing rawToken
    // For now, return success (token can be logged in dev)
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
