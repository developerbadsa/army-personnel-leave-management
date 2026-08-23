import { NextResponse } from "next/server";
import { authenticateRequest, getModeratorScope } from "@/lib/rbac";

export async function GET() {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const scope = getModeratorScope(user);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalAuthority: user.approvalAuthority,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        personnel: user.personnel,
        moderatorScope: scope,
        assignedModerators: user.assignedModerators,
      },
    });
  } catch (error) {
    console.error("Auth Me API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
