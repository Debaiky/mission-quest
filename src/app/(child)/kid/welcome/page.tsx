import { requireChild } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { WelcomeTour } from "@/components/child/welcome-tour";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Welcome" };

export default async function KidWelcomePage() {
  const ctx = await requireChild();
  const [child, missions] = await Promise.all([
    prisma.child.findUniqueOrThrow({ where: { id: ctx.childId }, select: { displayName: true, avatar: true } }),
    prisma.taskInstance.count({ where: { childId: ctx.childId, status: "PENDING" } }),
  ]);
  return <WelcomeTour name={child.displayName} avatar={resolveAvatar(child.avatar)} missionCount={missions} />;
}
