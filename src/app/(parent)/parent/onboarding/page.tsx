import Link from "next/link";
import { createChildAction } from "@/actions/children";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { Avatar } from "@/components/child/avatar";
import { ChildForm } from "@/components/parent/child-form";
import { OnboardingFamilyForm, StarterPacksForm } from "@/components/parent/onboarding-forms";
import { PageBody } from "@/components/parent/page-header";
import { PushToggle } from "@/components/shared/push-toggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Set up your family" };

const STEPS = [
  { key: "family", label: "Family" },
  { key: "child", label: "Children" },
  { key: "packs", label: "Missions" },
  { key: "done", label: "Done" },
] as const;
type Step = (typeof STEPS)[number]["key"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; created?: string }> }) {
  const ctx = await requireParent();
  const sp = await searchParams;
  const family = await prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, include: { children: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } } });
  const step: Step = STEPS.some((s) => s.key === sp.step) ? (sp.step as Step) : family.children.length === 0 ? "family" : "packs";
  const idx = STEPS.findIndex((s) => s.key === step);

  return (
    <PageBody className="mx-auto w-full max-w-3xl">
      <ol className="flex items-center gap-2 text-[13px]" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", i < idx ? "bg-success text-white" : i === idx ? "bg-primary text-on-primary" : "bg-surface-2 text-muted")}>{i < idx ? "✓" : i + 1}</span>
            <span className={cn("font-semibold", i === idx ? "text-ink" : "text-muted")}>{s.label}</span>
            {i < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-line" /> : null}
          </li>
        ))}
      </ol>

      {step === "family" ? (
        <Card>
          <CardBody className="flex flex-col gap-4 pt-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Your family</h1>
              <p className="text-sm text-muted">The timezone decides when a day ends for streaks. Sibling mode can be changed any time.</p>
            </div>
            <OnboardingFamilyForm name={family.name} timezone={family.timezone} mode={family.mode} />
          </CardBody>
        </Card>
      ) : null}

      {step === "child" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{family.children.length === 0 ? "Add your first child" : "Add another child"}</h1>
            <p className="text-sm text-muted">They log in with the family code {family.code} and the PIN you choose here.</p>
          </div>
          {family.children.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              {family.children.map((c) => (
                <span key={c.id} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-semibold text-ink">
                  <Avatar config={resolveAvatar(c.avatar)} size={28} /> {c.displayName}
                </span>
              ))}
              <Link href="/parent/onboarding?step=packs" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                That&apos;s everyone → choose missions
              </Link>
            </div>
          ) : null}
          <ChildForm action={createChildAction} mode="create" submitLabel="Add child" next="/parent/onboarding?step=child" initial={{ displayName: "", username: "", birthYear: "", avatar: { base: "fox", color: "orange", background: "sky" } }} />
        </div>
      ) : null}

      {step === "packs" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Starter missions</h1>
            <p className="text-sm text-muted">Pick packs to start with. Routine tasks auto-approve; chores wait for you. Edit anything afterwards under Tasks.</p>
          </div>
          {family.children.length === 0 ? (
            <Card className="p-6 text-sm text-muted">
              Add a child first.{" "}
              <Link href="/parent/onboarding?step=child" className="font-semibold text-primary">
                Add a child
              </Link>
            </Card>
          ) : (
            <StarterPacksForm kids={family.children.map((c) => ({ id: c.id, displayName: c.displayName, avatar: resolveAvatar(c.avatar) }))} />
          )}
        </div>
      ) : null}

      {step === "done" ? (
        <Card>
          <CardBody className="flex flex-col gap-5 pt-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">You&apos;re set up 🎉</h1>
              <p className="text-sm text-muted">{sp.created ? `${sp.created} missions are live from today.` : "Missions are live from today."} Here is what to hand to the kids.</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-4">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">Family code</div>
              <div className="font-display text-3xl font-bold tracking-wide text-ink">{family.code}</div>
              <p className="mt-1 text-[13px] text-muted">
                On any device: open the app → “I&apos;m a kid — let me in” → enter the code → tap their character → PIN. The device remembers the code.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {family.children.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm text-ink">
                  <Avatar config={resolveAvatar(c.avatar)} size={28} /> {c.displayName} · PIN you chose
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
              <div className="text-sm font-semibold text-ink">Get notified when they finish a mission</div>
              <PushToggle />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/parent" className={buttonVariants({ variant: "primary" })}>
                Go to your dashboard
              </Link>
              <Link href="/parent/tasks" className={buttonVariants({ variant: "secondary" })}>
                Review the missions
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </PageBody>
  );
}
