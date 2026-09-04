import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { getCosmeticOptions } from "@/lib/data/child-cosmetics";
import { AvatarEditor } from "@/components/child/avatar-editor";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Your character" };

export default async function AvatarPage() {
  const ctx = await requireChild();
  const [child, options] = await Promise.all([
    prisma.child.findUniqueOrThrow({ where: { id: ctx.childId }, select: { avatar: true } }),
    getCosmeticOptions(ctx.childId),
  ]);
  return <AvatarEditor initial={resolveAvatar(child.avatar)} options={options} />;
}
