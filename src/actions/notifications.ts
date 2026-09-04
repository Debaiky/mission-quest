"use server";

import { revalidatePath } from "next/cache";
import { requireUserAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/service";

export async function markNotificationReadAction(id: string): Promise<void> {
  const ctx = await requireUserAction();
  await markNotificationRead(prisma, ctx.userId, id);
  revalidatePath(ctx.role === "CHILD" ? "/kid" : "/parent");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const ctx = await requireUserAction();
  await markAllNotificationsRead(prisma, ctx.userId);
  revalidatePath(ctx.role === "CHILD" ? "/kid" : "/parent");
}
