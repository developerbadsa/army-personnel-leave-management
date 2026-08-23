import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSettingSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { key } = await params;
    const setting = await prisma.systemSetting.findUnique({ where: { key } });

    if (!setting) {
      return NextResponse.json({ success: false, error: `Setting '${key}' not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error("GET Setting Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch setting" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { key } = await params;
    const existing = await prisma.systemSetting.findUnique({ where: { key } });

    if (!existing) {
      return NextResponse.json({ success: false, error: `Setting '${key}' not found` }, { status: 404 });
    }

    const body = await req.json();
    const result = updateSettingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { value, description } = result.data;

    const updated = await prisma.systemSetting.update({
      where: { key },
      data: {
        value: value as Prisma.InputJsonValue,
        ...(description !== undefined ? { description } : {}),
        updatedById: user.id,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "SETTING_UPDATED",
      entityType: "SystemSetting",
      entityId: updated.id,
      oldValue: { value: existing.value },
      newValue: { value: updated.value },
      reason: `Updated system setting: ${key}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH Setting Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update setting" }, { status: 500 });
  }
}
