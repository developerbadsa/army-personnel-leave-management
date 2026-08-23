import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
    }

    // Users can only delete their own notifications
    if (notification.recipientId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You can only delete your own notifications" }, { status: 403 });
    }

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("DELETE Notification Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 });
  }
}
