import { z } from "zod";
import { isValidLocalDate, isValidLocalTime } from "@/lib/domain/dates";

const localDate = z.string().refine(isValidLocalDate, "Use a valid date");
const localTime = z.string().refine(isValidLocalTime, "Use a valid time");

export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, "Give the mission a name").max(80, "Keep it under 80 characters"),
    description: z.string().trim().max(200).optional().or(z.literal("")),
    icon: z.string().trim().min(1).max(8),
    categoryId: z.string().max(64).optional().or(z.literal("")),
    points: z.coerce.number().int("Whole numbers only").min(1, "At least 1 point").max(500, "500 points is the maximum"),
    difficulty: z.enum(["EASY", "NORMAL", "HARD", "EPIC"]),
    timeOfDay: z.enum(["MORNING", "AFTERNOON", "EVENING", "ANYTIME"]),
    scheduleType: z.enum(["ONCE", "DAILY", "WEEKLY"]),
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).default([]),
    startDate: localDate,
    endDate: localDate.optional().or(z.literal("")),
    dueTime: localTime.optional().or(z.literal("")),
    rolloverPolicy: z.enum(["EXPIRE", "ROLLOVER", "PERSIST"]),
    approvalMode: z.enum(["PARENT", "AUTO"]),
    isOptional: z.boolean().default(false),
    reminderEnabled: z.boolean().default(false),
    reminderTime: localTime.optional().or(z.literal("")),
    childIds: z.array(z.string().min(1).max(64)).min(1, "Choose at least one child"),
  })
  .superRefine((v, ctx) => {
    if (v.scheduleType === "WEEKLY" && v.daysOfWeek.length === 0) {
      ctx.addIssue({ code: "custom", path: ["daysOfWeek"], message: "Pick at least one day" });
    }
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date" });
    }
    if (v.reminderEnabled && !v.reminderTime) {
      ctx.addIssue({ code: "custom", path: ["reminderTime"], message: "Choose a reminder time" });
    }
  });

export type TaskInput = z.infer<typeof taskInputSchema>;

export const quickAddSchema = z.object({
  title: z.string().trim().min(1, "Give the mission a name").max(80),
  icon: z.string().trim().min(1).max(8).default("⭐"),
  points: z.coerce.number().int().min(1).max(500),
  childIds: z.array(z.string().min(1).max(64)).min(1, "Choose at least one child"),
  approvalMode: z.enum(["PARENT", "AUTO"]).default("PARENT"),
});
