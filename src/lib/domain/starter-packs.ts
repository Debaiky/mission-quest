import type { TimeOfDayLite } from "@/types/domain";

export interface StarterTask {
  title: string;
  icon: string;
  categoryKey: string;
  points: number;
  difficulty: "EASY" | "NORMAL" | "HARD" | "EPIC";
  timeOfDay: TimeOfDayLite;
  scheduleType: "DAILY" | "WEEKLY";
  daysOfWeek?: number[];
  dueTime?: string;
  approvalMode: "PARENT" | "AUTO";
  rolloverPolicy: "EXPIRE" | "ROLLOVER" | "PERSIST";
  isOptional?: boolean;
  description?: string;
}

export interface StarterPack {
  key: string;
  name: string;
  emoji: string;
  description: string;
  ages: string;
  tasks: StarterTask[];
}

const WEEKDAYS = [1, 2, 3, 4, 5];

/** Age-banded packs used by onboarding. Routine hygiene auto-approves; chores need a parent. */
export const STARTER_PACKS: StarterPack[] = [
  {
    key: "morning",
    name: "Morning routine",
    emoji: "☀️",
    description: "The four things that make mornings calm.",
    ages: "All ages",
    tasks: [
      { title: "Make your bed", icon: "🛏️", categoryKey: "bedroom", points: 10, difficulty: "NORMAL", timeOfDay: "MORNING", scheduleType: "DAILY", approvalMode: "AUTO", rolloverPolicy: "EXPIRE" },
      { title: "Brush your teeth", icon: "🦷", categoryKey: "personal", points: 5, difficulty: "EASY", timeOfDay: "MORNING", scheduleType: "DAILY", approvalMode: "AUTO", rolloverPolicy: "EXPIRE" },
      { title: "Get dressed", icon: "👕", categoryKey: "personal", points: 5, difficulty: "EASY", timeOfDay: "MORNING", scheduleType: "DAILY", approvalMode: "AUTO", rolloverPolicy: "EXPIRE" },
      { title: "Pack your school bag", icon: "🎒", categoryKey: "school", points: 10, difficulty: "NORMAL", timeOfDay: "MORNING", scheduleType: "WEEKLY", daysOfWeek: WEEKDAYS, dueTime: "07:30", approvalMode: "PARENT", rolloverPolicy: "EXPIRE" },
    ],
  },
  {
    key: "school",
    name: "School days",
    emoji: "✏️",
    description: "Homework and reading, Monday to Friday.",
    ages: "6–13",
    tasks: [
      { title: "Do your homework", icon: "✏️", categoryKey: "homework", points: 15, difficulty: "NORMAL", timeOfDay: "AFTERNOON", scheduleType: "WEEKLY", daysOfWeek: WEEKDAYS, approvalMode: "PARENT", rolloverPolicy: "ROLLOVER" },
      { title: "Read for 20 minutes", icon: "📚", categoryKey: "reading", points: 15, difficulty: "NORMAL", timeOfDay: "EVENING", scheduleType: "WEEKLY", daysOfWeek: [1, 2, 3, 4], dueTime: "19:00", approvalMode: "PARENT", rolloverPolicy: "ROLLOVER", description: "Any book you like. Comics count!" },
    ],
  },
  {
    key: "home",
    name: "Bedroom & helping out",
    emoji: "🏠",
    description: "Tidying and small jobs around the house.",
    ages: "All ages",
    tasks: [
      { title: "Tidy your room", icon: "🧸", categoryKey: "bedroom", points: 20, difficulty: "HARD", timeOfDay: "AFTERNOON", scheduleType: "WEEKLY", daysOfWeek: [3, 6], approvalMode: "PARENT", rolloverPolicy: "PERSIST" },
      { title: "Put toys away", icon: "🧩", categoryKey: "bedroom", points: 10, difficulty: "NORMAL", timeOfDay: "EVENING", scheduleType: "DAILY", approvalMode: "AUTO", rolloverPolicy: "EXPIRE" },
      { title: "Feed the pet", icon: "🐕", categoryKey: "helping", points: 10, difficulty: "NORMAL", timeOfDay: "ANYTIME", scheduleType: "DAILY", dueTime: "17:00", approvalMode: "PARENT", rolloverPolicy: "EXPIRE" },
      { title: "Help set the table", icon: "🍽️", categoryKey: "family", points: 5, difficulty: "EASY", timeOfDay: "EVENING", scheduleType: "DAILY", approvalMode: "AUTO", rolloverPolicy: "EXPIRE", isOptional: true },
    ],
  },
  {
    key: "evening",
    name: "Evening wind-down",
    emoji: "🌙",
    description: "A calm end to the day.",
    ages: "3–9",
    tasks: [
      { title: "Brush teeth before bed", icon: "🪥", categoryKey: "personal", points: 5, difficulty: "EASY", timeOfDay: "EVENING", scheduleType: "DAILY", approvalMode: "AUTO", rolloverPolicy: "EXPIRE" },
      { title: "Pajamas and lights out on time", icon: "🛌", categoryKey: "personal", points: 5, difficulty: "EASY", timeOfDay: "EVENING", scheduleType: "DAILY", dueTime: "20:00", approvalMode: "AUTO", rolloverPolicy: "EXPIRE" },
    ],
  },
  {
    key: "active",
    name: "Get moving",
    emoji: "⚽",
    description: "Daily movement and practice.",
    ages: "6–13",
    tasks: [
      { title: "30 minutes outside", icon: "🌳", categoryKey: "exercise", points: 10, difficulty: "NORMAL", timeOfDay: "AFTERNOON", scheduleType: "DAILY", approvalMode: "AUTO", rolloverPolicy: "EXPIRE" },
      { title: "Practice your instrument", icon: "🎹", categoryKey: "homework", points: 15, difficulty: "NORMAL", timeOfDay: "AFTERNOON", scheduleType: "WEEKLY", daysOfWeek: [1, 3, 5], approvalMode: "PARENT", rolloverPolicy: "EXPIRE" },
    ],
  },
];

export const DIFFICULTY_POINTS: Record<StarterTask["difficulty"], number> = { EASY: 5, NORMAL: 10, HARD: 20, EPIC: 50 };
