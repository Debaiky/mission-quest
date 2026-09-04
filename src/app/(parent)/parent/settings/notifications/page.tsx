import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { NotificationPrefsForm } from "@/components/parent/notification-prefs-form";
import { PushToggle } from "@/components/shared/push-toggle";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { resolveParentPrefs } from "@/types/domain";

export const metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const ctx = await requireParent();
  const parent = await prisma.parent.findUniqueOrThrow({ where: { id: ctx.parentId }, select: { notificationPrefs: true, user: { select: { email: true, _count: { select: { pushSubs: true } } } } } });
  const prefs = resolveParentPrefs(parent.notificationPrefs);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <NotificationPrefsForm prefs={prefs} email={parent.user.email ?? ""} />
      <Card className="self-start">
        <CardHeader title="This device" description={`${parent.user._count.pushSubs} ${parent.user._count.pushSubs === 1 ? "device" : "devices"} registered for push.`} />
        <CardBody>
          <PushToggle />
          <p className="mt-3 text-xs text-muted">On iPhone and iPad, add Mission Quest to the Home Screen first — Safari only delivers push to installed apps.</p>
        </CardBody>
      </Card>
    </div>
  );
}
