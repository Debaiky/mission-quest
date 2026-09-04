import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSessionCookie, validateSessionToken } from "./session";
import type { AuthContext, ChildContext, ParentContext } from "./types";

/**
 * The one place a request learns who is asking. Memoised per request with React cache()
 * so layouts, pages and actions in the same render share a single lookup.
 * Cookie renewal is deliberately not done here (Server Components cannot set cookies);
 * the login and refresh actions issue cookies.
 */
export const getSession = cache(async (): Promise<AuthContext | null> => {
  const token = await readSessionCookie();
  if (!token) return null;
  const validated = await validateSessionToken(token);
  return validated?.ctx ?? null;
});

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** For Server Components: redirects to the right login when no session. */
export async function requireUser(): Promise<AuthContext> {
  const ctx = await getSession();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireParent(): Promise<ParentContext> {
  const ctx = await getSession();
  if (!ctx) redirect("/login");
  if (ctx.role !== "PARENT" || !ctx.parentId) redirect("/kid");
  return ctx as ParentContext;
}

export async function requireChild(): Promise<ChildContext> {
  const ctx = await getSession();
  if (!ctx) redirect("/kid");
  if (ctx.role !== "CHILD" || !ctx.childId) redirect("/parent");
  return ctx as ChildContext;
}

/** For Server Actions and Route Handlers: throws instead of redirecting so callers can return errors. */
export async function requireParentAction(): Promise<ParentContext> {
  const ctx = await getSession();
  if (!ctx) throw new AuthError("UNAUTHENTICATED");
  if (ctx.role !== "PARENT" || !ctx.parentId) throw new AuthError("FORBIDDEN");
  return ctx as ParentContext;
}

export async function requireChildAction(): Promise<ChildContext> {
  const ctx = await getSession();
  if (!ctx) throw new AuthError("UNAUTHENTICATED");
  if (ctx.role !== "CHILD" || !ctx.childId) throw new AuthError("FORBIDDEN");
  return ctx as ChildContext;
}

export async function requireUserAction(): Promise<AuthContext> {
  const ctx = await getSession();
  if (!ctx) throw new AuthError("UNAUTHENTICATED");
  return ctx;
}
