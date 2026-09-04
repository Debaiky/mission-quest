"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireParentAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { isValidLocalDate, isValidLocalTime, localDateTimeToUtc } from "@/lib/domain/dates";
import { dispatchPendingDeliveries } from "@/lib/notifications/dispatch";
import { notify } from "@/lib/notifications/service";
import { fail, fieldErrorsFrom, formString, formStrings, type ActionState } from "@/lib/validation/common";

const schema = z
  .object({
    childIds: z.array(z.string().min(1).max(64)).min(1, "Choose at least one child"),
    message: z.string().trim().min(2, "Write a short message").max(200, "Keep it under 200 characters"),
    when: z.enum(["now", "later"]),
    date: z.string().optional().or(z.literal("")),
    time: z.string().optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.when === "later") {
      if (!v.date || !isValidLocalDate(v.date)) ctx.addIssue({ code: "custom", path: ["date"], message: "Pick a date" });
      if (!v.time || !isValidLocalTime(v.time)) ctx.addIssue({ code: "custom", path: ["time"], message: "Pick a time" });
    }
  });

export async function sendReminderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireParentAction();
  const parsed = schema.safeParse({
    childIds: formStrings(formData, "childIds"),
    message: formString(formData, "message"),
    when: formString(formData, "when") || "now",
    date: formString(formData, "date"),
    time: formString(formData, "time"),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const children = await prisma.child.findMany({ where: { id: { in: parsed.data.childIds }, familyId: ctx.familyId, archivedAt: null }, select: { id: true, displayName: true, userId: true } });
  if (children.length === 0) return fail("Choose at least one child.", { childIds: "Choose at least one child" });

  if (parsed.data.when === "later") {
    const scheduledFor = localDateTimeToUtc(parsed.data.date!, parsed.data.time!, ctx.timezone);
    if (scheduledFor.getTime() < Date.now() - 60_000) return fail("That time has already passed.", { time: "Pick a time in the future" });
    await prisma.reminder.createMany({
      data: children.map((c) => ({ familyId: ctx.familyId, childId: c.id, message: parsed.data.message, scheduledFor, createdById: ctx.userId })),
    });
    revalidatePath("/parent/notifications");
    return { ok: true, message: `Scheduled for ${children.map((c) => c.displayName).join(", ")} at ${parsed.data.time} on ${parsed.data.date}.` };
  }

  for (const c of children) {
    await notify(prisma, {
      familyId: ctx.familyId,
      recipientUserId: c.userId,
      type: "REMINDER",
      title: `A note from ${ctx.displayName}`,
      body: parsed.data.message,
      data: { url: "/kid" },
    });
  }
  after(() => dispatchPendingDeliveries());
  revalidatePath("/parent/notifications");
  revalidatePath("/kid", "layout");
  return { ok: true, message: `Sent to ${children.map((c) => c.displayName).join(", ")}.` };
}

export async function cancelReminderAction(reminderId: string): Promise<void> {
  const ctx = await requireParentAction();
  await prisma.reminder.updateMany({ where: { id: reminderId, familyId: ctx.familyId, status: "SCHEDULED" }, data: { status: "CANCELLED" } });
  revalidatePath("/parent/notifications");
}
