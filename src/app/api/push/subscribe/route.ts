import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser callers are rejected by the session check anyway
  return origin === request.nextUrl.origin;
}

/** Registers this browser for push notifications for the signed-in user. */
export async function POST(request: NextRequest) {
  const ctx = await getSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const body = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await prisma.pushSubscription.upsert({
    where: { endpoint: body.data.endpoint },
    create: { userId: ctx.userId, endpoint: body.data.endpoint, p256dh: body.data.keys.p256dh, auth: body.data.keys.auth, userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null },
    update: { userId: ctx.userId, p256dh: body.data.keys.p256dh, auth: body.data.keys.auth, failCount: 0 },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const body = z.object({ endpoint: z.string().url() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.data.endpoint, userId: ctx.userId } });
  return NextResponse.json({ ok: true });
}
