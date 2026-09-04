import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/** Either the root client or a transaction client; services accept both. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
