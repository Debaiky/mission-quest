import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require";
import { Wordmark } from "@/components/shared/wordmark";
import { ParentLoginForm } from "./login-form";

export const metadata = { title: "Parent log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const ctx = await getSession();
  if (ctx?.role === "PARENT") redirect("/parent");
  if (ctx?.role === "CHILD") redirect("/kid");
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Wordmark />
      <h1 className="mt-10 font-display text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-ink-2">Log in to manage missions, approvals and rewards.</p>
      <div className="mt-8">
        <ParentLoginForm next={next} />
      </div>
      <p className="mt-8 text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-primary no-underline hover:underline">
          Create a family
        </Link>
        {" · "}
        <Link href="/kid/login" className="font-semibold text-primary no-underline hover:underline">
          Kid log in
        </Link>
      </p>
    </main>
  );
}
