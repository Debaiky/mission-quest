import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, startOfWeekLocal, todayLocal } from "@/lib/domain/dates";
import { FamilySettingsForm } from "@/components/parent/family-settings-form";
import { ChallengeForm } from "@/components/parent/challenge-form";
import { resolveFamilySettings } from "@/types/domain";

export const metadata = { title: "Family settings" };

export default async function FamilySettingsPage() {
  const ctx = await requireParent();
  const today = todayLocal(ctx.timezone);
  const [family, challenge] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId } }),
    prisma.familyChallenge.findFirst({ where: { familyId: ctx.familyId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
  ]);
  let current = 0;
  if (challenge) {
    const agg = await prisma.pointTransaction.aggregate({ where: { familyId: ctx.familyId, amount: { gt: 0 }, localDate: { gte: challenge.startDate, lte: challenge.endDate } }, _sum: { amount: true } });
    current = agg._sum.amount ?? 0;
  }
  const weekStart = startOfWeekLocal(today);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <FamilySettingsForm family={{ name: family.name, code: family.code, timezone: family.timezone, mode: family.mode }} settings={resolveFamilySettings(family.settings)} />
      <ChallengeForm
        active={challenge ? { id: challenge.id, title: challenge.title, icon: challenge.icon, targetPoints: challenge.targetPoints, current, startDate: challenge.startDate, endDate: challenge.endDate, rewardTitle: challenge.rewardTitle } : null}
        defaults={{ startDate: weekStart, endDate: addLocalDays(weekStart, 6) }}
      />
    </div>
  );
}
