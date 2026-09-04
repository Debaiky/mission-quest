"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { hashPassword } from "@/lib/auth/password";
import { requireParentAction } from "@/lib/auth/require";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { emailSchema, parentPasswordSchema } from "@/lib/validation/auth";
import { fail, fieldErrorsFrom, formString, type ActionState } from "@/lib/validation/common";

const INVITE_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteResult = ActionState<{ link: string; emailed: boolean }>;

/** Creates a single-use invite link for a co-parent and emails it when email is configured. */
export async function createInviteAction(_prev: InviteResult, formData: FormData): Promise<InviteResult> {
  const ctx = await requireParentAction();
  const parsed = emailSchema.safeParse(formString(formData, "email"));
  if (!parsed.success) return fail("Enter a valid email address.", { email: parsed.error.issues[0]?.message ?? "Invalid" });
  const email = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email }, select: { familyId: true } });
  if (existing?.familyId === ctx.familyId) return fail("That person is already a parent in your family.", { email: "Already a parent here" });
  if (existing) return fail("That email already has a Mission Quest account with another family.", { email: "Already registered" });

  const token = randomBytes(24).toString("base64url");
  await prisma.familyInvite.deleteMany({ where: { familyId: ctx.familyId, email, acceptedAt: null } });
  await prisma.familyInvite.create({
    data: { familyId: ctx.familyId, email, tokenHash: hashToken(token), invitedById: ctx.userId, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) },
  });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${base}/join/${token}`;

  let emailed = false;
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const family = await prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { name: true } });
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `${ctx.displayName} invited you to ${family.name} on Mission Quest`,
        text: `${ctx.displayName} invited you to help run ${family.name} on Mission Quest.\n\nJoin here (link expires in ${INVITE_DAYS} days): ${link}`,
      });
      emailed = !res.error;
    } catch {
      emailed = false;
    }
  }
  revalidatePath("/parent/settings/account");
  return { ok: true, message: emailed ? `Invite emailed to ${email}. The link also works if you copy it.` : `Invite created. Email isn't configured here, so copy the link and send it to ${email}.`, data: { link, emailed } };
}

export async function revokeInviteAction(inviteId: string): Promise<void> {
  const ctx = await requireParentAction();
  await prisma.familyInvite.deleteMany({ where: { id: inviteId, familyId: ctx.familyId, acceptedAt: null } });
  revalidatePath("/parent/settings/account");
}

export interface InvitePreview {
  familyName: string;
  invitedBy: string;
  email: string;
}

export async function lookupInvite(token: string): Promise<InvitePreview | null> {
  if (!token || token.length < 16) return null;
  const invite = await prisma.familyInvite.findUnique({ where: { tokenHash: hashToken(token) }, include: { family: { select: { name: true } } } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return null;
  const inviter = await prisma.user.findUnique({ where: { id: invite.invitedById }, select: { displayName: true } });
  return { familyName: invite.family.name, invitedBy: inviter?.displayName ?? "A parent", email: invite.email };
}

/** The invitee creates their parent account inside the inviting family. */
export async function acceptInviteAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({ displayName: z.string().trim().min(1, "Tell us your name").max(60), password: parentPasswordSchema });
  const parsed = schema.safeParse({ displayName: formString(formData, "displayName"), password: formString(formData, "password") });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const invite = await prisma.familyInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return fail("This invite link is no longer valid. Ask for a new one.");
  const taken = await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } });
  if (taken) return fail("An account with this email already exists. Log in instead.");

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        familyId: invite.familyId,
        role: "PARENT",
        email: invite.email,
        emailVerifiedAt: new Date(),
        username: invite.email,
        passwordHash: await hashPassword(parsed.data.password),
        displayName: parsed.data.displayName,
        parent: { create: { familyId: invite.familyId } },
      },
    });
    await tx.familyInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return created;
  });
  const session = await createSession(user.id, "PARENT");
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/parent");
}
