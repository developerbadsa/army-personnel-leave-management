import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    max: 10,
    // Keep idle connections warm for 60s instead of the 10s default. The
    // remote (Prisma-hosted) Postgres costs ~400ms to re-establish a TLS
    // connection, so dropping idle sockets after a short pause made every
    // page feel slow between bursts of activity.
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
