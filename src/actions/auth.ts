"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { generateFamilyCode, isPlausibleFamilyCode, normalizeFamilyCode } from "@/lib/auth/family-code";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { CHILD_LOGIN_RULE, FAMILY_CODE_RULE, PARENT_LOGIN_RULE, isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/require";
import { clearSessionCookie, createSession, invalidateSession, setSessionCookie } from "@/lib/auth/session";
import { addLocalDays, todayLocal } from "@/lib/domain/dates";
import { ERRORS } from "@/lib/domain/copy";
import { childLoginSchema, familyCodeSchema, parentLoginSchema, signupSchema } from "@/lib/validation/auth";
import { fail, fieldErrorsFrom, formString, type ActionState } from "@/lib/validation/common";
import { DEFAULT_FAMILY_SETTINGS } from "@/types/domain";
import type { Prisma } from "@/generated/prisma/client";

async function userAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function safeNext(next: string | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

// ───────────────────────── Parent ─────────────────────────

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    displayName: formString(formData, "displayName"),
    familyName: formString(formData, "familyName"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
    timezone: formString(formData, "timezone") || "UTC",
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const input = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return fail("An account with that email already exists.", { email: "Already registered — try logging in." });

  const passwordHash = await hashPassword(input.password);
  let code = generateFamilyCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.family.findUnique({ where: { code }, select: { id: true } });
    if (!clash) break;
    code = generateFamilyCode();
  }

  const yesterday = addLocalDays(todayLocal(input.timezone), -1);
  const user = await prisma.$transaction(async (tx) => {
    const family = await tx.family.create({
      data: {
        name: input.familyName,
        code,
        timezone: input.timezone,
        settings: DEFAULT_FAMILY_SETTINGS as unknown as Prisma.InputJsonValue,
        lastClosedDate: yesterday,
      },
    });
    const created = await tx.user.create({
      data: {
        familyId: family.id,
        role: "PARENT",
        email: input.email,
        username: input.email,
        passwordHash,
        displayName: input.displayName,
        parent: { create: { familyId: family.id } },
      },
    });
    return created;
  });

  const session = await createSession(user.id, "PARENT", await userAgent());
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/parent/onboarding");
}

export async function parentLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parentLoginSchema.safeParse({ email: formString(formData, "email"), password: formString(formData, "password") });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const { email, password } = parsed.data;
  const next = safeNext(formString(formData, "next") || undefined, "/parent");

  const idEmail = `parent:${email}`;
  const idIp = `ip:${await clientIp()}`;
  if ((await isRateLimited(idEmail, PARENT_LOGIN_RULE)) || (await isRateLimited(idIp, { maxFailures: 30, windowMinutes: 15 }))) {
    return fail(ERRORS.rateLimited);
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { parent: true } });
  const valid = user && user.role === "PARENT" && !user.disabledAt && (await verifyPassword(user.passwordHash, password));
  await recordAttempt(idEmail, Boolean(valid));
  await recordAttempt(idIp, Boolean(valid));
  if (!valid || !user) return fail(ERRORS.login, { password: " " });

  const session = await createSession(user.id, "PARENT", await userAgent());
  await setSessionCookie(session.token, session.expiresAt);
  redirect(next);
}

// ───────────────────────── Child ─────────────────────────

export interface FamilyChildOption {
  id: string;
  displayName: string;
  avatar: unknown;
}

export interface FamilyLookup {
  ok: boolean;
  message?: string;
  familyName?: string;
  code?: string;
  children?: FamilyChildOption[];
}

/** Step 1 of the child login: family code → the family's children (first names + avatars only). */
export async function lookupFamilyAction(rawCode: string): Promise<FamilyLookup> {
  const parsedCode = familyCodeSchema.safeParse(rawCode);
  if (!parsedCode.success) return { ok: false, message: "Enter your family code." };
  const code = normalizeFamilyCode(parsedCode.data);
  if (!isPlausibleFamilyCode(code)) return { ok: false, message: "That doesn't look like a family code. It looks like SUNNY-FOX-42." };

  const idIp = `code:${await clientIp()}`;
  if (await isRateLimited(idIp, FAMILY_CODE_RULE)) return { ok: false, message: ERRORS.rateLimited };

  const family = await prisma.family.findUnique({
    where: { code },
    select: {
      name: true,
      code: true,
      children: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, displayName: true, avatar: true } },
    },
  });
  await recordAttempt(idIp, Boolean(family));
  if (!family) return { ok: false, message: "We couldn't find that family code. Ask a parent to check it." };
  return { ok: true, familyName: family.name, code: family.code, children: family.children };
}

export interface ChildLoginResult {
  ok: boolean;
  message?: string;
}

/** Step 3 of the child login: PIN/password for the chosen child. */
export async function childLoginAction(input: { familyCode: string; childId: string; secret: string }): Promise<ChildLoginResult> {
  const parsed = childLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: ERRORS.pin };
  const code = normalizeFamilyCode(parsed.data.familyCode);

  const identifier = `child:${code}:${parsed.data.childId}`;
  if (await isRateLimited(identifier, CHILD_LOGIN_RULE)) return { ok: false, message: "Let's take a short break. Ask a parent if you forgot your PIN." };

  const child = await prisma.child.findFirst({
    where: { id: parsed.data.childId, archivedAt: null, family: { code } },
    include: { user: true },
  });
  const valid = child && !child.user.disabledAt && (await verifyPassword(child.user.passwordHash, parsed.data.secret));
  await recordAttempt(identifier, Boolean(valid));
  if (!valid || !child) return { ok: false, message: ERRORS.pin };

  const session = await createSession(child.user.id, "CHILD", await userAgent());
  await setSessionCookie(session.token, session.expiresAt);
  return { ok: true };
}

// ───────────────────────── Shared ─────────────────────────

export async function logoutAction(): Promise<void> {
  const ctx = await getSession();
  if (ctx) await invalidateSession(ctx.sessionId);
  await clearSessionCookie();
  redirect(ctx?.role === "CHILD" ? "/kid/login" : "/login");
}
