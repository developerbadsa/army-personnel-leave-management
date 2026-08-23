import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue ?? Prisma.DbNull,
        newValue: params.newValue ?? Prisma.DbNull,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}
