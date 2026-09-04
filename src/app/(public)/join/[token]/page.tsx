import Link from "next/link";
import { redirect } from "next/navigation";
import { lookupInvite } from "@/actions/invites";
import { getSession } from "@/lib/auth/require";
import { Wordmark } from "@/components/shared/wordmark";
import { JoinForm } from "./join-form";

export const metadata = { title: "Join a family" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getSession();
  if (ctx?.role === "PARENT") redirect("/parent");
  const invite = await lookupInvite(token);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Wordmark />
      {invite ? (
        <>
          <h1 className="mt-10 font-display text-3xl font-bold tracking-tight text-ink">Join {invite.familyName}</h1>
          <p className="mt-1 text-ink-2">
            {invite.invitedBy} invited you to help run missions, approvals and rewards. Your login will be <strong>{invite.email}</strong>.
          </p>
          <div className="mt-8">
            <JoinForm token={token} />
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-10 font-display text-3xl font-bold tracking-tight text-ink">This invite link has expired</h1>
          <p className="mt-1 text-ink-2">Ask the parent who invited you to send a new one. Links last seven days and work once.</p>
          <Link href="/login" className="mt-6 text-sm font-semibold text-primary">
            Already have an account? Log in
          </Link>
        </>
      )}
    </main>
  );
}
