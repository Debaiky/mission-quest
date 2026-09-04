"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireChildAction } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { resolveAvatar, resolveChildSettings, type AvatarConfig } from "@/types/domain";

const settingsSchema = z.object({
  sound: z.boolean().optional(),
  animations: z.boolean().optional(),
  theme: z.enum(["sunrise", "night"]).optional(),
  welcomeSeen: z.boolean().optional(),
});

export async function updateChildSettingsAction(input: { sound?: boolean; animations?: boolean; theme?: "sunrise" | "night"; welcomeSeen?: boolean }): Promise<{ ok: boolean }> {
  const ctx = await requireChildAction();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const child = await prisma.child.findUniqueOrThrow({ where: { id: ctx.childId }, select: { settings: true } });
  const next = { ...resolveChildSettings(child.settings), ...parsed.data };
  await prisma.child.update({ where: { id: ctx.childId }, data: { settings: next as unknown as Prisma.InputJsonValue } });
  revalidatePath("/kid", "layout");
  return { ok: true };
}

const avatarSchema = z.object({
  base: z.string().min(1).max(40),
  color: z.string().min(1).max(40),
  background: z.string().min(1).max(40),
  hair: z.string().max(40).optional(),
  outfit: z.string().max(40).optional(),
  accessory: z.string().max(40).optional(),
  frame: z.string().max(40).optional(),
});

/** Only items the child owns (or free defaults) can be worn — enforced here, not in the editor. */
export async function updateAvatarAction(input: AvatarConfig): Promise<{ ok: boolean; message?: string }> {
  const ctx = await requireChildAction();
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That combination isn't valid." };
  const wanted = Object.values(parsed.data).filter((v): v is string => Boolean(v));
  const [items, owned] = await Promise.all([
    prisma.cosmeticItem.findMany({ where: { key: { in: wanted }, isActive: true }, select: { key: true, unlockType: true, slot: true } }),
    prisma.childCosmetic.findMany({ where: { childId: ctx.childId }, select: { item: { select: { key: true } } } }),
  ]);
  const ownedKeys = new Set(owned.map((o) => o.item.key));
  for (const key of wanted) {
    const item = items.find((i) => i.key === key);
    if (!item) return { ok: false, message: "Unknown item." };
    if (item.unlockType !== "DEFAULT" && !ownedKeys.has(key)) return { ok: false, message: "You haven't unlocked that yet." };
  }
  const current = await prisma.child.findUniqueOrThrow({ where: { id: ctx.childId }, select: { avatar: true } });
  const next = { ...resolveAvatar(current.avatar), ...parsed.data };
  await prisma.child.update({ where: { id: ctx.childId }, data: { avatar: next as unknown as Prisma.InputJsonValue } });
  revalidatePath("/kid", "layout");
  revalidatePath("/parent", "layout");
  return { ok: true };
}
