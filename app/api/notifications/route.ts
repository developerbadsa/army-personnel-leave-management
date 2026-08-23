import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const markReadSchema = z.object({
  notificationId: z.string().optional(),
  markAll: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { recipientId: user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("GET Notifications Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = markReadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { notificationId, markAll } = result.data;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { recipientId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    } else if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, recipientId: user.id },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, message: "Notifications updated" });
  } catch (error) {
    console.error("PUT Notifications Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update notifications" }, { status: 500 });
  }
}
