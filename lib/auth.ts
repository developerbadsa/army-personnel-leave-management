import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UserRole, ApprovalAuthority, UserStatus } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "army-leave-management-system-secret-key-32chars"
);

export const SESSION_COOKIE_NAME = "army_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  approvalAuthority: ApprovalAuthority;
  personnelId?: string | null;
  serviceId?: string | null;
  unitId?: string | null;
  sectionId?: string | null;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      personnel: {
        include: {
          unit: true,
          section: true,
        },
      },
      assignedModerators: {
        where: { isActive: true },
      },
    },
  });

  if (!user || user.status === UserStatus.DISABLED) {
    return null;
  }

  return user;
}
