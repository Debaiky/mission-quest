"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type State = "unsupported" | "no-keys" | "denied" | "off" | "on" | "working";

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Registers the service worker and toggles the push subscription for the signed-in user on this device. */
export function PushToggle({ variant = "parent" }: { variant?: "parent" | "kid" }) {
  const [state, setState] = useState<State>("working");
  const [note, setNote] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    const detect = async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported" as const;
      if (!publicKey) return "no-keys" as const;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        return sub ? ("on" as const) : Notification.permission === "denied" ? ("denied" as const) : ("off" as const);
      } catch {
        return "unsupported" as const;
      }
    };
    detect().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function enable() {
    setState("working");
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey!) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error("save failed");
      setState("on");
    } catch {
      setState("off");
      setNote("Couldn't turn on notifications on this device.");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  const isIos = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

  const kid = variant === "kid";
  const text = cn(kid ? "text-[13px] font-bold text-muted" : "text-[13px] text-muted");

  if (state === "unsupported") return <p className={text}>{isIos && !standalone ? "On iPhone and iPad, add Mission Quest to your Home Screen first (Share → Add to Home Screen), then turn on notifications here." : "This browser does not support notifications."}</p>;
  if (state === "no-keys") return <p className={text}>Push notifications are not configured on this server yet.</p>;
  if (state === "denied") return <p className={text}>Notifications are blocked for this site in your browser settings.</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === "on" ? (
        <>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold", "bg-success-soft text-success-ink")}>● On for this device</span>
          <Button type="button" variant={kid ? "kidGhost" : "ghost"} size="sm" onClick={disable}>
            Turn off
          </Button>
        </>
      ) : (
        <Button type="button" variant={kid ? "kidSoft" : "secondary"} size={kid ? "default" : "sm"} onClick={enable} disabled={state === "working"}>
          {state === "working" ? "…" : "Turn on notifications on this device"}
        </Button>
      )}
      {note ? <span className={text}>{note}</span> : null}
    </div>
  );
}
