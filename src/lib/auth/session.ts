import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import type { AuthContext } from "./types";

export const SESSION_COOKIE = "mq_session";

const DAY_MS = 86_400_000;
const PARENT_SESSION_DAYS = 14;
const CHILD_SESSION_DAYS = 30;

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function lifetimeFor(role: "PARENT" | "CHILD"): number {
  return (role === "CHILD" ? CHILD_SESSION_DAYS : PARENT_SESSION_DAYS) * DAY_MS;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(userId: string, role: "PARENT" | "CHILD", userAgent?: string | null): Promise<CreatedSession> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + lifetimeFor(role));
  await prisma.session.create({
    data: { id: hashSessionToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) ?? null },
  });
  return { token, expiresAt };
}

export interface ValidatedSession {
  ctx: AuthContext;
  /** Set when the session was extended and the cookie should be re-issued. */
  renewedExpiresAt?: Date;
}

/**
 * Looks the session up by the hash of the cookie token. Expired sessions are deleted.
 * Sessions are extended (sliding) once less than half their lifetime remains.
 */
export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  if (!token || token.length < 20) return null;
  const id = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          family: { select: { id: true, timezone: true } },
          child: { select: { id: true, archivedAt: true } },
          parent: { select: { id: true } },
        },
      },
    },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }

  const user = session.user;
  if (user.disabledAt || (user.role === "CHILD" && (!user.child || user.child.archivedAt))) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }

  let renewedExpiresAt: Date | undefined;
  const lifetime = lifetimeFor(user.role);
  if (session.expiresAt.getTime() - now < lifetime / 2) {
    renewedExpiresAt = new Date(now + lifetime);
    await prisma.session.update({ where: { id }, data: { expiresAt: renewedExpiresAt, lastActiveAt: new Date() } });
  }

  const ctx: AuthContext = {
    userId: user.id,
    role: user.role,
    familyId: user.family.id,
    timezone: user.family.timezone,
    displayName: user.displayName,
    childId: user.child?.id,
    parentId: user.parent?.id,
    sessionId: id,
  };
  return { ctx, renewedExpiresAt };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
