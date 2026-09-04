import Link from "next/link";
import { notFound } from "next/navigation";
import { updateChildAction } from "@/actions/children";
import { requireParent } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { ChildForm } from "@/components/parent/child-form";
import { PageBody, PageHeader } from "@/components/parent/page-header";
import { ChildDangerZone } from "@/components/parent/child-danger-zone";
import { resolveAvatar } from "@/types/domain";

export const metadata = { title: "Edit child" };

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireParent();
  const { id } = await params;
  const child = await prisma.child.findFirst({ where: { id, familyId: ctx.familyId, archivedAt: null }, include: { user: { select: { username: true } } } });
  if (!child) notFound();
  const action = updateChildAction.bind(null, child.id);
  return (
    <>
      <PageHeader
        back={
          <Link href={`/parent/children/${child.id}`} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 no-underline hover:bg-surface-2">
            ←
          </Link>
        }
        title={`Edit ${child.displayName}`}
      />
      <PageBody>
        <ChildForm action={action} mode="edit" submitLabel="Save changes" initial={{ displayName: child.displayName, username: child.user.username, birthYear: child.birthYear ? String(child.birthYear) : "", avatar: resolveAvatar(child.avatar) }} />
        <ChildDangerZone childId={child.id} childName={child.displayName} />
      </PageBody>
    </>
  );
}
