import Link from "next/link";
import { createChildAction } from "@/actions/children";
import { requireParent } from "@/lib/auth/require";
import { ChildForm } from "@/components/parent/child-form";
import { PageBody, PageHeader } from "@/components/parent/page-header";

export const metadata = { title: "Add child" };

export default async function NewChildPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireParent();
  const { next } = await searchParams;
  return (
    <>
      <PageHeader
        back={
          <Link href="/parent/children" aria-label="Back to children" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 no-underline hover:bg-surface-2">
            ←
          </Link>
        }
        title="Add a child"
        description="No email needed. They log in with your family code, tap their character and enter a PIN."
      />
      <PageBody>
        <ChildForm action={createChildAction} mode="create" submitLabel="Add child" next={next} initial={{ displayName: "", username: "", birthYear: "", avatar: { base: "fox", color: "orange", background: "sky" } }} />
      </PageBody>
    </>
  );
}
