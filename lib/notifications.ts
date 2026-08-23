import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        actorId: params.actorId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
