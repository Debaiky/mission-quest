import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require";
import { Wordmark } from "@/components/shared/wordmark";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create a family" };

export default async function SignupPage() {
  const ctx = await getSession();
  if (ctx?.role === "PARENT") redirect("/parent");
  if (ctx?.role === "CHILD") redirect("/kid");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Wordmark />
      <h1 className="mt-10 font-display text-3xl font-bold tracking-tight text-ink">Create your family</h1>
      <p className="mt-1 text-ink-2">Takes two minutes. You&apos;ll add children and missions next.</p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="mt-8 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary no-underline hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
