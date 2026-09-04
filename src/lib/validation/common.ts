import { z } from "zod";

/** Standard shape returned by every form action so `useActionState` can render errors. */
export interface ActionState<T = undefined> {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

export const idle: ActionState = { ok: false };

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function fail<T = undefined>(message: string, fieldErrors?: Record<string, string>): ActionState<T> {
  return { ok: false, message, fieldErrors };
}

export function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export function formStrings(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === "string");
}

export function formBool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function formInt(formData: FormData, key: string): number | undefined {
  const v = formData.get(key);
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
