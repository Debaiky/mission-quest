import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id with parameters that keep login snappy on serverless while staying well above
// the OWASP minimums for a family app. Children's PINs use the same code path; the
// rate limiter (rate-limit.ts) is what protects short secrets.
const OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain, OPTIONS);
  } catch {
    return false;
  }
}

export const PARENT_PASSWORD_MIN = 10;
export const CHILD_SECRET_MIN = 4;

export function isPin(value: string): boolean {
  return /^\d{4,6}$/.test(value);
}
