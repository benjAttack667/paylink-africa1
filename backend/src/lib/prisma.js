import { PrismaClient } from "@prisma/client";

const prismaClient = globalThis.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prismaClient;
}

export const prisma = prismaClient;

