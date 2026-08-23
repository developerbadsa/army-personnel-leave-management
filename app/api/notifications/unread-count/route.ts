import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const unreadCount = await prisma.notification.count({
      where: { recipientId: user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error("GET Unread Count Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch unread count" }, { status: 500 });
  }
}
