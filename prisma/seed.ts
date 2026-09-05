import "dotenv/config";
import { PrismaClient, UserRole, ApprovalAuthority, UserStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";  const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString, idleTimeoutMillis: 60_000, connectionTimeoutMillis: 10_000, keepAlive: true });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Create Default Leave Types
  const leaveTypes = [
    {
      name: "Annual Leave",
      code: "ANNUAL",
      description: "Standard yearly recreation leave",
      defaultAllowance: 30,
      minDays: 1,
      maxDays: 30,
      requiresAttachment: false,
      allowHalfDay: false,
      allowBackdated: false,
    },
    {
      name: "Casual Leave",
      code: "CASUAL",
      description: "Short-term unforeseen absence",
      defaultAllowance: 10,
      minDays: 1,
      maxDays: 3,
      requiresAttachment: false,
      allowHalfDay: true,
      allowBackdated: false,
    },
    {
      name: "Medical Leave",
      code: "MEDICAL",
      description: "Leave due to illness or medical treatment",
      defaultAllowance: 14,
      minDays: 1,
      maxDays: 60,
      requiresAttachment: true,
      allowHalfDay: false,
      allowBackdated: true,
    },
    {
      name: "Earned Leave",
      code: "EARNED",
      description: "Accumulated earned leave entitlement",
      defaultAllowance: 30,
      minDays: 1,
      maxDays: 30,
      requiresAttachment: false,
      allowHalfDay: false,
      allowBackdated: false,
    },
    {
      name: "Special Leave",
      code: "SPECIAL",
      description: "Special circumstance leave approved by authority",
      defaultAllowance: 10,
      minDays: 1,
      maxDays: 15,
      requiresAttachment: true,
      allowHalfDay: false,
      allowBackdated: false,
    },
    {
      name: "Emergency Leave",
      code: "EMERGENCY",
      description: "Urgent family or personal emergency",
      defaultAllowance: 7,
      minDays: 1,
      maxDays: 7,
      requiresAttachment: false,
      allowHalfDay: false,
      allowBackdated: true,
    },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: lt,
      create: lt,
    });
  }
  console.log(`✅ Seeded ${leaveTypes.length} leave types`);

  // 2. Create Sample Units and Sections
  const sampleUnits = [
    {
      name: "HQ Battalion",
      code: "HQ-BN",
      description: "Headquarters Battalion Unit",
      sections: [
        { name: "Administration Section", code: "HQ-ADMIN" },
        { name: "Operations Section", code: "HQ-OPS" },
        { name: "Quarter Master Section", code: "HQ-QM" },
      ],
    },
    {
      name: "1st Infantry Unit",
      code: "1-INF",
      description: "First Line Infantry Unit",
      sections: [
        { name: "Alpha Company", code: "1-INF-A" },
        { name: "Bravo Company", code: "1-INF-B" },
      ],
    },
  ];

  for (const u of sampleUnits) {
    const unit = await prisma.unit.upsert({
      where: { code: u.code },
      update: { name: u.name, description: u.description },
      create: { name: u.name, code: u.code, description: u.description },
    });

    for (const s of u.sections) {
      await prisma.section.upsert({
        where: {
          unitId_code: {
            unitId: unit.id,
            code: s.code,
          },
        },
        update: { name: s.name },
        create: {
          unitId: unit.id,
          name: s.name,
          code: s.code,
        },
      });
    }
  }
  console.log(`✅ Seeded sample units & sections`);

  // 3. Create Default Super Admin User
  const adminEmail = "sowmentopu@gmail.com";
  const passwordHash = await bcrypt.hash("Admin@123456", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      approvalAuthority: ApprovalAuthority.NONE,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      approvalAuthority: ApprovalAuthority.NONE,
      status: UserStatus.ACTIVE,
    },
  });

  const hqUnit = await prisma.unit.findUnique({ where: { code: "HQ-BN" } });
  if (hqUnit) {
    await prisma.personnel.upsert({
      where: { serviceId: "ADMIN-001" },
      update: {
        userId: adminUser.id,
        fullName: "Topu",
        rank: "Major",
        unitId: hqUnit.id,
        email: adminEmail,
        photoUrl: "/uploads/topu-avatar.jpg",
      },
      create: {
        userId: adminUser.id,
        serviceId: "ADMIN-001",
        fullName: "Topu",
        rank: "Major",
        email: adminEmail,
        unitId: hqUnit.id,
        photoUrl: "/uploads/topu-avatar.jpg",
      },
    });
  }
  console.log(`✅ Seeded Default Admin (${adminEmail})`);

  // 4. Default System Settings
  const defaultSettings = [
    {
      key: "ORGANIZATION_NAME",
      value: { name: "Bangladesh Army - Personnel & Leave Wing" },
      description: "Display name of the organization",
    },
    {
      key: "LEAVE_POLICY_DEFAULTS",
      value: {
        requireCommanderOrQM: true,
        allowWeekendOverlapCalculation: true,
        maxAdvanceApplicationDays: 60,
      },
      description: "Default leave calculation and approval rules",
    },
  ];

  for (const st of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: st.key },
      update: { value: st.value, description: st.description },
      create: { key: st.key, value: st.value, description: st.description },
    });
  }
  console.log(`✅ Seeded default system settings`);

  console.log("🚀 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
