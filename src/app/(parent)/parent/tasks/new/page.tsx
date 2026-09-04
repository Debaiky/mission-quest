import Link from "next/link";
import { createTaskAction } from "@/actions/tasks";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { getTaskFormOptions } from "@/lib/data/parent-tasks";
import { defaultStartDate } from "@/lib/services/tasks";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { TaskForm } from "@/components/parent/task-form";

export const metadata = { title: "New task" };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const ctx = await requireParent();
  const { child } = await searchParams;
  const [{ children, categories }, family] = await Promise.all([getTaskFormOptions(ctx), prisma.family.findUniqueOrThrow({ where: { id: ctx.familyId }, select: { settings: true } })]);
  const startDate = defaultStartDate(ctx, family.settings);

  return (
    <>
      <PageHeader
        back={
          <Link href="/parent/tasks" aria-label="Back to tasks" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 no-underline hover:bg-surface-2">
            ←
          </Link>
        }
        title="New task"
        description={startDate === defaultStartDate(ctx, {}) ? "Starts today unless you pick another date." : "It's late in the day, so this starts tomorrow unless you change the date."}
      />
      <PageBody>
        <TaskForm
          mode="create"
          action={createTaskAction}
          submitLabel="Create task"
          kids={children}
          categories={categories}
          initial={{
            title: "",
            description: "",
            icon: "⭐",
            categoryId: "",
            points: 10,
            difficulty: "NORMAL",
            timeOfDay: "ANYTIME",
            scheduleType: "DAILY",
            daysOfWeek: [1, 2, 3, 4, 5],
            startDate,
            endDate: "",
            dueTime: "",
            rolloverPolicy: "EXPIRE",
            approvalMode: "PARENT",
            isOptional: false,
            reminderEnabled: false,
            reminderTime: "18:30",
            childIds: child && children.some((c) => c.id === child) ? [child] : children.map((c) => c.id),
          }}
        />
      </PageBody>
    </>
  );
}
