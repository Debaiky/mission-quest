import { z } from "zod";
import { isValidTimeZone } from "@/lib/domain/dates";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

export const parentPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "That's a very long password — 200 characters is the limit");

export const childSecretSchema = z
  .string()
  .min(4, "Use at least 4 characters or digits")
  .max(64);

export const timezoneSchema = z
  .string()
  .trim()
  .refine((tz) => isValidTimeZone(tz), "Unknown timezone");

export const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Tell us your name").max(60),
  familyName: z.string().trim().min(1, "Give your family a name").max(60),
  email: emailSchema,
  password: parentPasswordSchema,
  timezone: timezoneSchema,
});

export const parentLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const familyCodeSchema = z.string().trim().min(5, "Enter your family code").max(40);

export const childLoginSchema = z.object({
  familyCode: familyCodeSchema,
  childId: z.string().min(1),
  secret: z.string().min(1, "Enter your PIN").max(64),
});

export const usernameLoginSchema = z.object({
  familyCode: familyCodeSchema,
  username: z.string().trim().toLowerCase().min(2).max(40),
  secret: z.string().min(1).max(64),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type ParentLoginInput = z.infer<typeof parentLoginSchema>;
