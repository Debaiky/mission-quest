import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { AccountForms } from "@/components/parent/account-forms";
import { InviteForm } from "@/components/parent/invite-form";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const ctx = await requireParent();
  const [user, parents, invites] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { displayName: true, email: true, createdAt: true } }),
    prisma.user.findMany({ where: { familyId: ctx.familyId, role: "PARENT", disabledAt: null }, select: { id: true, displayName: true, email: true } }),
    prisma.familyInvite.findMany({ where: { familyId: ctx.familyId, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "asc" } }),
  ]);
  return (
    <AccountForms
      user={{ displayName: user.displayName, email: user.email ?? "" }}
      parents={parents}
      selfId={ctx.userId}
      invites={<InviteForm pending={invites.map((i) => ({ id: i.id, email: i.email, expiresAt: i.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: ctx.timezone }) }))} />}
    />
  );
}
