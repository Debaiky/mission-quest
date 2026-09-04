import { NextResponse, type NextRequest } from "next/server";
import { pruneLoginAttempts } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db/prisma";
import { dispatchPendingDeliveries } from "@/lib/notifications/dispatch";
import { ensureFamilyDayState } from "@/lib/services/day-close";
import { runFamilyReminders } from "@/lib/services/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hourly tick (vercel.json). Correctness never depends on it — every read self-heals —
 * but reminders, summaries and outbox retries are only timely when it runs.
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const families = await prisma.family.findMany({ select: { id: true, name: true } });
  const results: Record<string, unknown>[] = [];
  for (const f of families) {
    try {
      const day = await ensureFamilyDayState(f.id);
      const reminders = await runFamilyReminders(prisma, f.id);
      results.push({ family: f.name, closed: day.closedDates.length, ...reminders });
    } catch (error) {
      results.push({ family: f.name, error: (error as Error).message });
    }
  }
  const deliveries = await dispatchPendingDeliveries(200);
  const pruned = await pruneLoginAttempts();
  return NextResponse.json({ ok: true, ms: Date.now() - started, families: results, deliveries, prunedLoginAttempts: pruned });
}

export const GET = handle;
export const POST = handle;
