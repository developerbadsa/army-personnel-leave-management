import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (user) {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
      const userAgent = req.headers.get("user-agent");
      await createAuditLog({
        actorId: user.id,
        action: "AUTH_LOGOUT",
        entityType: "User",
        entityId: user.id,
        reason: "User logged out",
        ipAddress: ip,
        userAgent: userAgent,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log out" },
      { status: 500 }
    );
  }
}
