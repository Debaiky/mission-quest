import { z } from "zod";
import { childSecretSchema } from "./auth";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "At least 2 characters")
  .max(30, "Keep it under 30 characters")
  .regex(/^[a-z0-9._-]+$/, "Letters, numbers, dots, dashes and underscores only");

export const childInputSchema = z.object({
  displayName: z.string().trim().min(1, "What's their name?").max(40),
  username: usernameSchema,
  birthYear: z
    .union([z.literal(""), z.coerce.number().int().min(1990).max(new Date().getUTCFullYear())])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  base: z.string().min(1).max(40),
  color: z.string().min(1).max(40),
  background: z.string().min(1).max(40),
});

export const createChildSchema = childInputSchema.extend({
  secret: childSecretSchema,
});

export const resetSecretSchema = z.object({
  secret: childSecretSchema,
});

export const dayOffSchema = z.object({
  childId: z.string().min(1).max(64),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  reason: z.string().trim().max(80).optional().or(z.literal("")),
});
