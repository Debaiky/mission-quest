import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { ParentSidebar } from "@/components/parent/sidebar";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireParent();
  const [family, approvalsCount, unreadNotifications] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { name: true, timezone: true } }),
    prisma.taskInstance.count({ where: { familyId: ctx.familyId, status: "SUBMITTED" } }),
    prisma.notification.count({ where: { recipientId: ctx.userId, readAt: null } }),
  ]);

  return (
    <div data-theme="slate" className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <ParentSidebar parentName={ctx.displayName} familyName={family.name} timezone={family.timezone} approvalsCount={approvalsCount} unreadNotifications={unreadNotifications} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
