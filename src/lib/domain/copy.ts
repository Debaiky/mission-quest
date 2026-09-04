/**
 * Child-facing copy bank (docs/phase-2-design.md §7).
 * Everything here is positive by construction. Never add: fail, lose, behind, lazy, wrong,
 * penalty, expired, reject.
 */

function pick<T>(items: readonly T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return items[h % items.length];
}

export function greeting(name: string, localTime: string): string {
  const hour = Number(localTime.slice(0, 2));
  if (hour < 12) return `Good morning, ${name}! ☀️`;
  if (hour < 17) return `Hi, ${name}! 👋`;
  return `Evening, ${name}! 🌙`;
}

export function todayStatusLine(input: {
  assigned: number;
  completed: number;
  submittedPending: number;
  isGolden: boolean;
  isRestDay: boolean;
}): string {
  if (input.isRestDay) return "No missions today — enjoy your day!";
  const left = input.assigned - input.completed;
  if (left <= 0) {
    if (input.submittedPending > 0) return "All sent! Waiting for approval ✨";
    return input.isGolden ? "Golden day! 👑" : "All done — you're amazing!";
  }
  if (input.completed === 0) return "Let's start with one mission.";
  if (left === 1) return "1 more mission for a golden day!";
  return `${left} more missions for a golden day!`;
}

export function streakFooter(streak: number, doneToday: boolean, isEvening: boolean): string {
  if (doneToday) return streak === 1 ? "Day 1! Come back tomorrow to make it 2." : `Day ${streak}! See you tomorrow.`;
  if (streak === 0) return "Do 1 mission today to start a streak.";
  if (isEvening) return "Keep it alive — 1 mission is all it takes.";
  return `Do 1 mission today to make it ${streak + 1}.`;
}

export const GOLDEN_EXPLAINER = "Golden = every mission done.";
export const STREAK_EXPLAINER = "A streak is doing at least one mission a day. A golden streak is doing all of them.";

export function streakBrokenLine(previous: number): string {
  return `Your ${previous}-day streak ended. New adventure starts today 🚀`;
}

export function missedLine(count: number): string {
  if (count === 1) return "You missed 1 mission yesterday. Tomorrow is a new chance!";
  return `You missed ${count} missions yesterday. Tomorrow is a new chance!`;
}

export const RETRY_SUGGESTIONS = [
  "Almost there — give it one more try!",
  "Looks great, just tidy the corners.",
  "Nearly done — can you finish the last bit?",
] as const;

export const REMINDER_TEMPLATES = [
  "Don't forget to read tonight 📚",
  "Your room mission is waiting for you!",
  "You've got missions left today!",
  "You're one mission away from keeping your golden streak!",
] as const;

export function missionCompleteHeadline(seed: string): string {
  return pick(["MISSION COMPLETE!", "AMAZING!", "YOU DID IT!", "SUPER!"] as const, seed);
}

export function encouragement(seed: string): string {
  return pick(
    [
      "You're doing great!",
      "One more mission!",
      "You're almost there!",
      "Keep your streak alive!",
      "Let's get back on track!",
      "Tomorrow is another chance!",
    ] as const,
    seed,
  );
}

export const EMPTY = {
  missions: "No missions today — enjoy your day!",
  badges: "No badges yet. Your first one is close!",
  rewards: "No rewards yet. Ask Mom or Dad to add some!",
  approvals: "Nothing to approve. Enjoy the quiet ☕",
  tasks: "No tasks yet. Create your first task and it appears on your children's missions.",
  children: "Add your first child to get started.",
} as const;

export const ERRORS = {
  save: "Couldn't save that. Check your connection and try again.",
  pin: "Hmm, that PIN didn't match. Try again.",
  login: "That email and password don't match.",
  rateLimited: "Let's take a short break. Try again in a few minutes.",
} as const;
