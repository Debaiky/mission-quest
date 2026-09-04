"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { childLoginAction, lookupFamilyAction, type FamilyChildOption } from "@/actions/auth";
import { Avatar } from "@/components/child/avatar";
import { cn } from "@/lib/utils";
import { resolveAvatar } from "@/types/domain";

const STORAGE_KEY = "mq.familyCode";

type Step = "code" | "who" | "pin";

export function KidLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState<FamilyChildOption[]>([]);
  const [chosen, setChosen] = useState<FamilyChildOption | null>(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();

  // Remembered family code → skip straight to the avatar picker (after mount, so SSR matches).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (!saved) return;
    const remembered = saved;
    const id = window.setTimeout(() => {
      setCode(remembered);
      lookup(remembered, true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function lookup(value: string, silent = false) {
    setMessage(null);
    startTransition(async () => {
      const res = await lookupFamilyAction(value);
      if (!res.ok || !res.children) {
        if (!silent) setMessage(res.message ?? "Try again.");
        return;
      }
      setFamilyName(res.familyName ?? "");
      setChildren(res.children);
      setCode(res.code ?? value);
      try {
        localStorage.setItem(STORAGE_KEY, res.code ?? value);
      } catch {
        /* private mode */
      }
      setStep("who");
    });
  }

  function choose(child: FamilyChildOption) {
    setChosen(child);
    setPin("");
    setMessage(null);
    setStep("pin");
  }

  function submitPin(value: string) {
    if (!chosen) return;
    startTransition(async () => {
      const res = await childLoginAction({ familyCode: code, childId: chosen.id, secret: value });
      if (res.ok) {
        router.replace("/kid");
        router.refresh();
        return;
      }
      setMessage(res.message ?? "Try again.");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    });
  }

  function pressKey(k: string) {
    if (pending) return;
    if (k === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + k).slice(0, 6);
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  function forgetCode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setChildren([]);
    setChosen(null);
    setStep("code");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pb-10 pt-14">
      {step === "code" && (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-display text-3xl font-extrabold text-ink">What&apos;s your family code?</h1>
            <p className="text-[15px] font-bold text-muted">Ask Mom or Dad. It looks like SUNNY-FOX-42.</p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              lookup(code);
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUNNY-FOX-42"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-label="Family code"
              className="h-16 w-full rounded-2xl border-2 border-line bg-surface px-4 text-center font-display text-2xl font-extrabold tracking-[0.08em] text-ink shadow-card placeholder:text-muted/60 focus:border-primary focus:outline-none"
            />
            {message ? (
              <p role="alert" className="rounded-2xl bg-peach px-4 py-3 text-center text-[15px] font-extrabold text-peach-ink">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending || code.trim().length < 5}
              className="h-14 w-full rounded-2xl bg-primary font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--primary-deep)] disabled:opacity-60"
            >
              {pending ? "Looking…" : "Next"}
            </button>
          </form>
          <p className="text-center text-sm font-bold text-muted">
            Are you a parent?{" "}
            <Link href="/login" className="font-extrabold text-primary no-underline">
              Log in here
            </Link>
          </p>
        </>
      )}

      {step === "who" && (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-display text-3xl font-extrabold text-ink">Who&apos;s playing?</h1>
            <p className="flex items-center gap-2 text-sm font-bold text-muted">
              {familyName}
              <span className="rounded-full bg-surface px-2.5 py-0.5 font-display text-[13px] font-extrabold tracking-wide text-ink-2 shadow-card">{code}</span>
              <button type="button" onClick={forgetCode} className="min-h-11 px-2 font-extrabold text-primary">
                Change
              </button>
            </p>
          </div>
          {children.length === 0 ? (
            <p className="rounded-2xl bg-surface p-5 text-center text-[15px] font-bold text-ink-2 shadow-card">
              No kids yet in this family. Ask a parent to add you first!
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => choose(c)}
                  className="flex min-h-[132px] flex-col items-center gap-2 rounded-[20px] border-[2.5px] border-transparent bg-surface/60 px-1 pb-3 pt-3 font-extrabold text-ink-2 shadow-card transition hover:border-primary focus-visible:border-primary"
                >
                  <Avatar config={resolveAvatar(c.avatar)} size={84} />
                  <span className="text-[15px]">{c.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === "pin" && chosen && (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar config={resolveAvatar(chosen.avatar)} size={96} />
            <h1 className="font-display text-2xl font-extrabold text-ink">Hi {chosen.displayName}! Enter your PIN</h1>
            <div className={cn("flex gap-3.5", shake && "animate-[shake_.4s_ease]")} aria-live="polite" aria-label={`${pin.length} of 4 digits entered`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("h-4 w-4 rounded-full border-[2.5px] border-primary", i < pin.length && "bg-primary")} />
              ))}
            </div>
            {message ? (
              <p role="alert" className="rounded-2xl bg-peach px-4 py-2 text-[15px] font-extrabold text-peach-ink">
                {message}
              </p>
            ) : null}
          </div>
          <div className="rounded-[20px] bg-surface p-4 shadow-card">
            <div className="grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
                <Key key={k} onClick={() => pressKey(k)} disabled={pending}>
                  {k}
                </Key>
              ))}
              <button type="button" onClick={() => setStep("who")} className="h-[60px] rounded-2xl text-sm font-extrabold text-muted">
                Not me
              </button>
              <Key onClick={() => pressKey("0")} disabled={pending}>
                0
              </Key>
              <button type="button" onClick={() => pressKey("back")} aria-label="Delete last digit" className="flex h-[60px] items-center justify-center rounded-2xl">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-2">
                  <path d="M21 4H8l-6 8 6 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <path d="m18 9-6 6M12 9l6 6" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-center text-sm font-bold text-muted">Forgot your PIN? Ask a parent — they can set a new one.</p>
        </>
      )}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </main>
  );
}

function Key({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[60px] rounded-2xl bg-surface font-display text-[26px] font-extrabold text-ink shadow-[0_3px_0_var(--line)] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
    >
      {children}
    </button>
  );
}
