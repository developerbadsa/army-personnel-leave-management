import { NextResponse } from "next/server";
import { authenticateRequest, hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    if (!hasRole(user, [UserRole.ADMIN])) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany({
      include: {
        updatedBy: {
          select: {
            id: true,
            email: true,
            personnel: { select: { fullName: true } },
          },
        },
      },
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET Settings Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 });
  }
}
