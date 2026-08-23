import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole, EventType, EventAudienceType, NotificationType } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(EventType),
  startAt: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date/time"),
  endAt: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date/time"),
  location: z.string().optional().nullable(),
  isPublished: z.boolean().optional().default(true),
  audienceType: z.nativeEnum(EventAudienceType).default(EventAudienceType.ALL),
  unitIds: z.array(z.string()).optional().default([]),
  sectionIds: z.array(z.string()).optional().default([]),
  personnelIds: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    const events = await prisma.event.findMany({
      where: {
        isPublished: true,
        startAt: startStr ? { gte: new Date(startStr) } : undefined,
        endAt: endStr ? { lte: new Date(endStr) } : undefined,
      },
      include: {
        audiences: {
          include: {
            unit: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            personnel: { select: { id: true, fullName: true } },
          },
        },
        createdBy: {
          select: { id: true, email: true },
        },
      },
      orderBy: { startAt: "asc" },
    });

    // Filter by audience if normal user
    const filtered = events.filter((ev) => {
      if (user.role === UserRole.ADMIN) return true;
      if (ev.audiences.length === 0) return true;

      const hasAll = ev.audiences.some((a) => a.audienceType === EventAudienceType.ALL);
      if (hasAll) return true;

      if (!user.personnel) return false;

      const matchesUnit = ev.audiences.some(
        (a) => a.audienceType === EventAudienceType.UNIT && a.unitId === user.personnel?.unitId
      );
      const matchesSection = ev.audiences.some(
        (a) => a.audienceType === EventAudienceType.SECTION && a.sectionId === user.personnel?.sectionId
      );
      const matchesPersonnel = ev.audiences.some(
        (a) => a.audienceType === EventAudienceType.PERSONNEL && a.personnelId === user.personnel?.id
      );

      return matchesUnit || matchesSection || matchesPersonnel;
    });

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("GET Events Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const result = createEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      type,
      startAt,
      endAt,
      location,
      isPublished,
      audienceType,
      unitIds,
      sectionIds,
      personnelIds,
    } = result.data;

    const audiencesToCreate: {
      audienceType: EventAudienceType;
      unitId?: string;
      sectionId?: string;
      personnelId?: string;
    }[] = [];

    if (audienceType === EventAudienceType.ALL) {
      audiencesToCreate.push({ audienceType: EventAudienceType.ALL });
    } else if (audienceType === EventAudienceType.UNIT && unitIds.length > 0) {
      unitIds.forEach((uid) => audiencesToCreate.push({ audienceType: EventAudienceType.UNIT, unitId: uid }));
    } else if (audienceType === EventAudienceType.SECTION && sectionIds.length > 0) {
      sectionIds.forEach((sid) =>
        audiencesToCreate.push({ audienceType: EventAudienceType.SECTION, sectionId: sid })
      );
    } else if (audienceType === EventAudienceType.PERSONNEL && personnelIds.length > 0) {
      personnelIds.forEach((pid) =>
        audiencesToCreate.push({ audienceType: EventAudienceType.PERSONNEL, personnelId: pid })
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        type,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        location,
        isPublished,
        createdById: user.id,
        audiences: {
          create: audiencesToCreate,
        },
      },
      include: { audiences: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: "EVENT_CREATED",
      entityType: "Event",
      entityId: event.id,
      newValue: event as unknown as import("@prisma/client").Prisma.InputJsonValue,
      reason: `Created event ${title}`,
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    console.error("POST Event Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create event" }, { status: 500 });
  }
}
