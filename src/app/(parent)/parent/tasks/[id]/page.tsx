import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTaskAction } from "@/actions/tasks";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { getTaskFormOptions } from "@/lib/data/parent-tasks";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { TaskForm } from "@/components/parent/task-form";

export const metadata = { title: "Edit task" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireParent();
  const { id } = await params;
  const task = await prisma.task.findFirst({ where: { id, familyId: ctx.familyId }, include: { assignments: { where: { removedAt: null } } } });
  if (!task) notFound();
  const [{ children, categories }, completed, points, missed] = await Promise.all([
    getTaskFormOptions(ctx),
    prisma.taskInstance.count({ where: { taskId: id, status: "APPROVED" } }),
    prisma.pointTransaction.aggregate({ where: { instance: { taskId: id }, type: "TASK_APPROVED" }, _sum: { amount: true } }),
    prisma.taskInstance.count({ where: { taskId: id, status: "MISSED" } }),
  ]);
  const action = updateTaskAction.bind(null, task.id);

  return (
    <>
      <PageHeader
        back={
          <Link href="/parent/tasks" aria-label="Back to tasks" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 no-underline hover:bg-surface-2">
            ←
          </Link>
        }
        title="Edit task"
        description="Changes apply from today onward. Missions already completed keep their points."
      />
      <PageBody>
        <TaskForm
          mode="edit"
          action={action}
          submitLabel="Save task"
          kids={children}
          categories={categories}
          stats={{ completed, points: points._sum.amount ?? 0, missed }}
          initial={{
            title: task.title,
            description: task.description ?? "",
            icon: task.icon,
            categoryId: task.categoryId ?? "",
            points: task.points,
            difficulty: task.difficulty,
            timeOfDay: task.timeOfDay,
            scheduleType: task.scheduleType,
            daysOfWeek: task.daysOfWeek,
            startDate: task.startDate,
            endDate: task.scheduleType === "ONCE" ? "" : (task.endDate ?? ""),
            dueTime: task.dueTime ?? "",
            rolloverPolicy: task.rolloverPolicy,
            approvalMode: task.approvalMode,
            isOptional: task.isOptional,
            reminderEnabled: task.reminderEnabled,
            reminderTime: task.reminderTime ?? "18:30",
            childIds: task.assignments.map((a) => a.childId),
          }}
        />
      </PageBody>
    </>
  );
}
