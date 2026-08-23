import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, EventType, EventAudienceType, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateEventSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(EventType).optional(),
  startAt: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid start date"),
  endAt: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid end date"),
  location: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  audienceType: z.nativeEnum(EventAudienceType).optional(),
  unitIds: z.array(z.string()).optional(),
  sectionIds: z.array(z.string()).optional(),
  personnelIds: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        audiences: {
          include: {
            unit: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
            personnel: { select: { id: true, fullName: true, serviceId: true } },
          },
        },
        createdBy: {
          select: { id: true, email: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("GET Event Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch event" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updateEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const { audienceType, unitIds, sectionIds, personnelIds, ...eventData } = data;

    const updateData: Prisma.EventUpdateInput = {
      ...eventData,
      startAt: eventData.startAt ? new Date(eventData.startAt) : undefined,
      endAt: eventData.endAt ? new Date(eventData.endAt) : undefined,
    };

    // Update audiences if provided
    if (audienceType !== undefined) {
      // Delete existing audiences and recreate
      await prisma.eventAudience.deleteMany({ where: { eventId: id } });

      const audiencesToCreate: Array<{
        audienceType: EventAudienceType;
        unitId?: string;
        sectionId?: string;
        personnelId?: string;
      }> = [];

      if (audienceType === EventAudienceType.ALL) {
        audiencesToCreate.push({ audienceType: EventAudienceType.ALL });
      } else if (audienceType === EventAudienceType.UNIT && unitIds && unitIds.length > 0) {
        unitIds.forEach((uid) => audiencesToCreate.push({ audienceType: EventAudienceType.UNIT, unitId: uid }));
      } else if (audienceType === EventAudienceType.SECTION && sectionIds && sectionIds.length > 0) {
        sectionIds.forEach((sid) => audiencesToCreate.push({ audienceType: EventAudienceType.SECTION, sectionId: sid }));
      } else if (audienceType === EventAudienceType.PERSONNEL && personnelIds && personnelIds.length > 0) {
        personnelIds.forEach((pid) => audiencesToCreate.push({ audienceType: EventAudienceType.PERSONNEL, personnelId: pid }));
      }

      updateData.audiences = {
        create: audiencesToCreate,
      };
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
      include: { audiences: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: "EVENT_UPDATED",
      entityType: "Event",
      entityId: id,
      oldValue: existing as unknown as Prisma.InputJsonValue,
      newValue: updated as unknown as Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH Event Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      action: "EVENT_DELETED",
      entityType: "Event",
      entityId: id,
      oldValue: existing as unknown as Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("DELETE Event Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete event" }, { status: 500 });
  }
}
