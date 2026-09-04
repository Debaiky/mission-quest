import Link from "next/link";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { getParentDashboard } from "@/lib/data/parent-dashboard";
import { Avatar } from "@/components/child/avatar";
import { CrownIcon, FlameIcon, StarIcon } from "@/components/child/icons";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/field";
import { EMPTY } from "@/lib/domain/copy";
import { resolveFamilySettings } from "@/types/domain";

export const metadata = { title: "Children" };

export default async function ChildrenPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const ctx = await requireParent();
  const { archived } = await searchParams;
  const [d, family] = await Promise.all([getParentDashboard(ctx), prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { code: true, settings: true } })]);
  const settings = resolveFamilySettings(family.settings);
  const canAdd = d.children.length < settings.maxChildren;

  return (
    <>
      <PageHeader
        title="Children"
        description={`Family code ${family.code} · kids log in with it plus their PIN`}
        actions={
          canAdd ? (
            <Link href="/parent/children/new" className={buttonVariants({ variant: "primary" })}>
              + Add child
            </Link>
          ) : (
            <span className="text-[13px] text-muted">Limit of {settings.maxChildren} reached · raise it in Settings</span>
          )
        }
      />
      <PageBody>
        {archived ? <FormMessage tone="info" message="Child archived. Their history and points are kept; they can no longer log in." /> : null}
        {d.children.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 p-8">
            <p className="font-display text-lg font-semibold text-ink">{EMPTY.children}</p>
            <Link href="/parent/children/new" className={buttonVariants({ variant: "primary" })}>
              Add your first child
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.children.map((c) => (
              <Card key={c.id} className="flex flex-col gap-4 p-5">
                <Link href={`/parent/children/${c.id}`} className="flex items-center gap-3 no-underline">
                  <Avatar config={c.avatar} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-semibold text-ink">{c.displayName}</div>
                    <div className="text-[12.5px] text-muted">
                      Level {c.level} · {c.levelName} · {c.pointsBalance} points to spend
                    </div>
                  </div>
                </Link>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Mini icon={<FlameIcon size={20} />} value={c.currentStreak} label="streak" />
                  <Mini icon={<CrownIcon size={20} />} value={c.currentGoldenStreak} label="golden" />
                  <Mini icon={<StarIcon size={20} className="text-sun" />} value={c.pointsThisWeek} label="this week" />
                </div>
                <div className="flex gap-2 border-t border-line pt-3">
                  <Link href={`/parent/children/${c.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    View
                  </Link>
                  <Link href={`/parent/children/${c.id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    Edit
                  </Link>
                  <Link href={`/parent/tasks/new?child=${c.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    + Task
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

function Mini({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-surface-2 py-2">
      {icon}
      <span className="font-display text-lg font-bold leading-none text-ink">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}
