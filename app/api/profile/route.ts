import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
  phone: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("GET Profile Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { fullName, phone, bloodGroup, photoUrl } = result.data;

    // If user has linked personnel record, update it
    if (user.personnel?.id) {
      const updatedPersonnel = await prisma.personnel.update({
        where: { id: user.personnel.id },
        data: {
          fullName: fullName ?? undefined,
          phone: phone ?? undefined,
          bloodGroup: bloodGroup ?? undefined,
          photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedPersonnel,
        message: "Profile updated successfully",
      });
    }

    return NextResponse.json({
      success: true,
      message: "No linked personnel record found",
    });
  } catch (error) {
    console.error("PUT Profile Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
