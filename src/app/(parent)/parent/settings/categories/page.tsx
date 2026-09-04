import { archiveCategoryAction } from "@/actions/settings";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { CategoryForm } from "@/components/parent/category-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const ctx = await requireParent();
  const categories = await prisma.category.findMany({
    where: { OR: [{ familyId: null }, { familyId: ctx.familyId }], archivedAt: null },
    orderBy: [{ familyId: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { tasks: { where: { status: { not: "ARCHIVED" } } } } } },
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader title="Categories" description="Built-in categories are shared by every family. Add your own for anything else." />
        <ul className="flex flex-col">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-t border-line px-5 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-lg" aria-hidden="true">
                {c.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink">{c.name}</div>
                <div className="text-xs text-muted">
                  {c.familyId ? "Custom" : "Built-in"} · {c._count.tasks} {c._count.tasks === 1 ? "task" : "tasks"}
                </div>
              </div>
              {c.familyId ? (
                <form action={archiveCategoryAction.bind(null, c.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <CategoryForm />
    </div>
  );
}
