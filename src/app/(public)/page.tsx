import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require";
import { Wordmark } from "@/components/shared/wordmark";

export default async function LandingPage() {
  const ctx = await getSession();
  if (ctx?.role === "PARENT") redirect("/parent");
  if (ctx?.role === "CHILD") redirect("/kid");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Wordmark size="md" />
        <Link href="/login" className="text-sm font-semibold text-primary no-underline hover:underline">
          Parent log in
        </Link>
      </header>

      <section className="mt-16 flex flex-col gap-6">
        <p className="label-caps">For families</p>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Daily routines, turned into missions worth doing.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-ink-2">
          Parents set the missions and the points. Kids build streaks, level up and unlock rewards. Nobody nags.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-[10px] bg-primary px-6 text-base font-semibold text-on-primary no-underline hover:bg-primary-deep"
          >
            Create a family
          </Link>
          <Link
            href="/kid/login"
            className="inline-flex h-12 items-center justify-center rounded-[10px] border border-line bg-surface px-6 text-base font-semibold text-ink no-underline hover:bg-surface-2"
          >
            I&apos;m a kid — let me in
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Missions, not chores", body: "Every task is a mission card with points. Kids tap Done; parents approve or trust routines to auto-approve." },
          { title: "Two streaks", body: "A streak for showing up every day, and a golden streak for finishing everything. Rest days never break either." },
          { title: "Rewards you control", body: "Points buy rewards you define — dessert choice, movie night, an extra story. Nothing costs money unless you say so." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-base font-semibold text-ink">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
