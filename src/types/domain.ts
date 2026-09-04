/** "YYYY-MM-DD" in the family's timezone. Never a Date. */
export type LocalDate = string;

/** "HH:mm" 24-hour local time. */
export type LocalTime = string;

export type InstanceStatusLite = "PENDING" | "SUBMITTED" | "APPROVED" | "MISSED" | "CANCELLED";
export type TimeOfDayLite = "MORNING" | "AFTERNOON" | "EVENING" | "ANYTIME";

export interface FamilySettings {
  /** Soft cap on children shown in the UI; the schema has no limit. */
  maxChildren: number;
  /** Bonus for the first approved mission of a local day (0 disables). */
  firstMissionBonus: number;
  /** Bonus paid at day close when the day is golden (0 disables). */
  perfectDayBonus: number;
  /** Streak lengths that pay a milestone bonus. */
  streakMilestones: number[];
  streakMilestoneBonus: number;
  /** After this local time a new task defaults to starting tomorrow. */
  lateTaskCutoff: LocalTime;
  /** No push/email between these local times. */
  quietHoursStart: LocalTime;
  quietHoursEnd: LocalTime;
  /** Local time of the evening "streak at risk" nudge. */
  streakRiskReminderTime: LocalTime;
  /** Local time of the parent's daily summary. */
  dailySummaryTime: LocalTime;
  soundDefault: boolean;
  animationsDefault: boolean;
  /** A cosmetic chest every N golden days (0 disables). */
  chestEveryGoldenDays: number;
  /** Show the optional sibling leaderboard to children (only in LEADERBOARD mode). */
  leaderboardVisibleToChildren: boolean;
}

export const DEFAULT_FAMILY_SETTINGS: FamilySettings = {
  maxChildren: 3,
  firstMissionBonus: 5,
  perfectDayBonus: 20,
  streakMilestones: [7, 14, 30, 60, 100],
  streakMilestoneBonus: 25,
  lateTaskCutoff: "18:00",
  quietHoursStart: "20:30",
  quietHoursEnd: "07:00",
  streakRiskReminderTime: "18:30",
  dailySummaryTime: "19:30",
  soundDefault: false,
  animationsDefault: true,
  chestEveryGoldenDays: 5,
  leaderboardVisibleToChildren: false,
};

export function resolveFamilySettings(raw: unknown): FamilySettings {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<FamilySettings>;
  return { ...DEFAULT_FAMILY_SETTINGS, ...obj };
}

export interface ChildSettings {
  sound: boolean;
  animations: boolean;
  /** "sunrise" | "night" — the child's own theme choice. */
  theme: "sunrise" | "night";
  /** The first-run tour has been completed or skipped. */
  welcomeSeen: boolean;
}

export const DEFAULT_CHILD_SETTINGS: ChildSettings = {
  sound: false,
  animations: true,
  theme: "sunrise",
  welcomeSeen: false,
};

export function resolveChildSettings(raw: unknown): ChildSettings {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<ChildSettings>;
  return { ...DEFAULT_CHILD_SETTINGS, ...obj };
}

/** Layered avatar. Every value is a CosmeticItem key; undefined slots use the base defaults. */
export interface AvatarConfig {
  base: string;
  color: string;
  background: string;
  hair?: string;
  outfit?: string;
  accessory?: string;
  frame?: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  base: "fox",
  color: "orange",
  background: "sky",
};

export function resolveAvatar(raw: unknown): AvatarConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<AvatarConfig>;
  return { ...DEFAULT_AVATAR, ...obj };
}

export type NotificationChannelKey = "IN_APP" | "PUSH" | "EMAIL";

export interface ParentNotificationPrefs {
  push: boolean;
  email: boolean;
  /** Per type opt-outs; missing = enabled. */
  types: Partial<Record<string, boolean>>;
}

export const DEFAULT_PARENT_NOTIFICATION_PREFS: ParentNotificationPrefs = {
  push: true,
  email: true,
  types: {},
};

export function resolveParentPrefs(raw: unknown): ParentNotificationPrefs {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<ParentNotificationPrefs>;
  return { ...DEFAULT_PARENT_NOTIFICATION_PREFS, ...obj, types: { ...(obj.types ?? {}) } };
}

/** Discriminated union evaluated by the achievement engine. Adding a type = one case in evaluateCriteria. */
export type AchievementCriteria =
  | { type: "STREAK_DAYS"; days: number }
  | { type: "GOLDEN_STREAK_DAYS"; days: number }
  | { type: "LIFETIME_XP"; xp: number }
  | { type: "TOTAL_MISSIONS"; count: number }
  | { type: "CATEGORY_MISSIONS"; categoryKey: string; count: number }
  | { type: "GOLDEN_DAYS_TOTAL"; count: number }
  | { type: "LEVEL_REACHED"; level: number }
  | { type: "ACTIVE_DAYS_TOTAL"; days: number }
  | { type: "REWARD_REDEEMED"; count: number }
  | { type: "TIME_OF_DAY_MISSIONS"; timeOfDay: TimeOfDayLite; count: number }
  | { type: "OPTIONAL_MISSIONS"; count: number };

/** Everything the achievement engine needs to evaluate every criteria type. */
export interface ChildSnapshot {
  currentStreak: number;
  longestStreak: number;
  currentGoldenStreak: number;
  longestGoldenStreak: number;
  lifetimeXp: number;
  level: number;
  totalCompleted: number;
  totalGoldenDays: number;
  activeDays: number;
  rewardsRedeemed: number;
  missionsByCategoryKey: Record<string, number>;
  missionsByTimeOfDay: Record<TimeOfDayLite, number>;
  optionalCompleted: number;
}
