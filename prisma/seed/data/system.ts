import type { AchievementCategory, CosmeticSlot, UnlockType } from "@/generated/prisma/client";
import type { AchievementCriteria } from "@/types/domain";

// ───────────────────────── Categories (system defaults) ─────────────────────────

export interface CategorySeed {
  key: string;
  name: string;
  emoji: string;
  color: string;
  sortOrder: number;
}

export const SYSTEM_CATEGORIES: CategorySeed[] = [
  { key: "morning", name: "Morning", emoji: "☀️", color: "sun", sortOrder: 1 },
  { key: "school", name: "School", emoji: "🎒", color: "sky", sortOrder: 2 },
  { key: "homework", name: "Homework", emoji: "✏️", color: "berry", sortOrder: 3 },
  { key: "reading", name: "Reading", emoji: "📚", color: "sky", sortOrder: 4 },
  { key: "exercise", name: "Exercise", emoji: "⚽", color: "leaf", sortOrder: 5 },
  { key: "bedroom", name: "Bedroom", emoji: "🛏️", color: "berry", sortOrder: 6 },
  { key: "helping", name: "Helping at home", emoji: "🏠", color: "leaf", sortOrder: 7 },
  { key: "personal", name: "Personal care", emoji: "🧼", color: "sky", sortOrder: 8 },
  { key: "family", name: "Family", emoji: "🧡", color: "flame", sortOrder: 9 },
  { key: "other", name: "Other", emoji: "⭐", color: "sun", sortOrder: 10 },
];

// ───────────────────────── Achievements ─────────────────────────

export interface AchievementSeed {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  xpReward: number;
  pointsReward?: number;
  isSecret?: boolean;
  sortOrder: number;
}

export const ACHIEVEMENTS: AchievementSeed[] = [
  { key: "streak_3", name: "3 Day Streak", description: "Missions three days in a row.", icon: "🔥", category: "STREAK", criteria: { type: "STREAK_DAYS", days: 3 }, xpReward: 10, sortOrder: 10 },
  { key: "streak_7", name: "7 Day Streak", description: "Seven days in a row!", icon: "🔥", category: "STREAK", criteria: { type: "STREAK_DAYS", days: 7 }, xpReward: 25, sortOrder: 11 },
  { key: "streak_14", name: "Two Weeks Strong", description: "Fourteen days in a row.", icon: "🔥", category: "STREAK", criteria: { type: "STREAK_DAYS", days: 14 }, xpReward: 40, sortOrder: 12 },
  { key: "streak_30", name: "30 Day Streak", description: "A whole month without missing a day.", icon: "🌋", category: "STREAK", criteria: { type: "STREAK_DAYS", days: 30 }, xpReward: 80, sortOrder: 13 },
  { key: "streak_100", name: "Century", description: "One hundred days in a row. Legendary.", icon: "💯", category: "STREAK", criteria: { type: "STREAK_DAYS", days: 100 }, xpReward: 200, sortOrder: 14 },
  { key: "consistency_30", name: "Consistency Champion", description: "Did missions on 30 different days.", icon: "💪", category: "STREAK", criteria: { type: "ACTIVE_DAYS_TOTAL", days: 30 }, xpReward: 50, sortOrder: 15 },

  { key: "golden_first", name: "First Golden Day", description: "Every mission done in one day.", icon: "👑", category: "GOLDEN", criteria: { type: "GOLDEN_DAYS_TOTAL", count: 1 }, xpReward: 15, sortOrder: 20 },
  { key: "golden_week", name: "Perfect Week", description: "Seven golden days in a row.", icon: "🏆", category: "GOLDEN", criteria: { type: "GOLDEN_STREAK_DAYS", days: 7 }, xpReward: 60, sortOrder: 21 },
  { key: "golden_10", name: "10 Golden Days", description: "Ten perfect days in total.", icon: "👑", category: "GOLDEN", criteria: { type: "GOLDEN_DAYS_TOTAL", count: 10 }, xpReward: 40, sortOrder: 22 },
  { key: "golden_30", name: "Golden Month", description: "Thirty perfect days in total.", icon: "🌟", category: "GOLDEN", criteria: { type: "GOLDEN_DAYS_TOTAL", count: 30 }, xpReward: 100, sortOrder: 23 },

  { key: "points_100", name: "First 100", description: "You earned your first 100 points!", icon: "⭐", category: "POINTS", criteria: { type: "LIFETIME_XP", xp: 100 }, xpReward: 10, sortOrder: 30 },
  { key: "points_500", name: "500 Points", description: "Five hundred points earned.", icon: "⭐", category: "POINTS", criteria: { type: "LIFETIME_XP", xp: 500 }, xpReward: 25, sortOrder: 31 },
  { key: "points_1000", name: "1,000 Points", description: "One thousand points. Wow.", icon: "🌟", category: "POINTS", criteria: { type: "LIFETIME_XP", xp: 1000 }, xpReward: 50, sortOrder: 32 },
  { key: "points_5000", name: "5,000 Points", description: "Five thousand points earned.", icon: "💫", category: "POINTS", criteria: { type: "LIFETIME_XP", xp: 5000 }, xpReward: 150, sortOrder: 33 },

  { key: "missions_10", name: "Mission Starter", description: "Ten missions complete.", icon: "🎯", category: "MISSIONS", criteria: { type: "TOTAL_MISSIONS", count: 10 }, xpReward: 10, sortOrder: 40 },
  { key: "missions_50", name: "Mission Pro", description: "Fifty missions complete.", icon: "🎯", category: "MISSIONS", criteria: { type: "TOTAL_MISSIONS", count: 50 }, xpReward: 30, sortOrder: 41 },
  { key: "missions_100", name: "Mission Master", description: "One hundred missions complete.", icon: "🏅", category: "MISSIONS", criteria: { type: "TOTAL_MISSIONS", count: 100 }, xpReward: 60, sortOrder: 42 },
  { key: "missions_500", name: "Mission Legend", description: "Five hundred missions complete.", icon: "🏆", category: "MISSIONS", criteria: { type: "TOTAL_MISSIONS", count: 500 }, xpReward: 200, sortOrder: 43 },
  { key: "extra_mile", name: "Extra Mile", description: "Five bonus missions done.", icon: "✨", category: "MISSIONS", criteria: { type: "OPTIONAL_MISSIONS", count: 5 }, xpReward: 20, sortOrder: 44 },

  { key: "reading_hero", name: "Reading Hero", description: "Twenty reading missions.", icon: "📚", category: "CATEGORY", criteria: { type: "CATEGORY_MISSIONS", categoryKey: "reading", count: 20 }, xpReward: 30, sortOrder: 50 },
  { key: "helping_hands", name: "Helping Hands", description: "Fifteen helping-at-home missions.", icon: "🤝", category: "CATEGORY", criteria: { type: "CATEGORY_MISSIONS", categoryKey: "helping", count: 15 }, xpReward: 30, sortOrder: 51 },
  { key: "super_starter", name: "Super Starter", description: "Twenty morning missions done.", icon: "🚀", category: "CATEGORY", criteria: { type: "TIME_OF_DAY_MISSIONS", timeOfDay: "MORNING", count: 20 }, xpReward: 30, sortOrder: 52 },
  { key: "evening_star", name: "Evening Star", description: "Thirty evening missions. You found a secret badge!", icon: "🌙", category: "SPECIAL", criteria: { type: "TIME_OF_DAY_MISSIONS", timeOfDay: "EVENING", count: 30 }, xpReward: 40, isSecret: true, sortOrder: 53 },

  { key: "level_5", name: "Champion", description: "Reached Level 5.", icon: "🏅", category: "LEVEL", criteria: { type: "LEVEL_REACHED", level: 5 }, xpReward: 0, sortOrder: 60 },
  { key: "level_10", name: "Knight of the Castle", description: "Reached Level 10.", icon: "🏰", category: "LEVEL", criteria: { type: "LEVEL_REACHED", level: 10 }, xpReward: 0, sortOrder: 61 },
  { key: "first_treat", name: "First Treat", description: "Redeemed your first reward.", icon: "🎁", category: "SPECIAL", criteria: { type: "REWARD_REDEEMED", count: 1 }, xpReward: 10, sortOrder: 70 },
];

// ───────────────────────── Cosmetics ─────────────────────────

export interface CosmeticSeed {
  key: string;
  slot: CosmeticSlot;
  name: string;
  rarity?: string;
  unlockType?: UnlockType;
  unlockLevel?: number;
  unlockAchievementKey?: string;
  sortOrder: number;
}

export const COSMETICS: CosmeticSeed[] = [
  // Bases and colours are free.
  { key: "fox", slot: "BASE", name: "Fox", sortOrder: 1 },
  { key: "bear", slot: "BASE", name: "Bear", sortOrder: 2 },
  { key: "cat", slot: "BASE", name: "Cat", sortOrder: 3 },
  { key: "panda", slot: "BASE", name: "Panda", sortOrder: 4 },
  { key: "owl", slot: "BASE", name: "Owl", sortOrder: 5 },
  { key: "bunny", slot: "BASE", name: "Bunny", sortOrder: 6 },
  { key: "orange", slot: "SKIN", name: "Orange", sortOrder: 1 },
  { key: "brown", slot: "SKIN", name: "Brown", sortOrder: 2 },
  { key: "grey", slot: "SKIN", name: "Grey", sortOrder: 3 },
  { key: "cream", slot: "SKIN", name: "Cream", sortOrder: 4 },
  { key: "blue", slot: "SKIN", name: "Blue", sortOrder: 5 },
  { key: "pink", slot: "SKIN", name: "Pink", sortOrder: 6 },
  { key: "mint", slot: "SKIN", name: "Mint", unlockType: "CHEST", rarity: "rare", sortOrder: 7 },
  // Backgrounds follow the world map.
  { key: "sky", slot: "BACKGROUND", name: "Sky", sortOrder: 1 },
  { key: "meadow", slot: "BACKGROUND", name: "Meadow", sortOrder: 2 },
  { key: "background_forest", slot: "BACKGROUND", name: "Whispering Forest", unlockType: "LEVEL", unlockLevel: 4, sortOrder: 3 },
  { key: "background_mountain", slot: "BACKGROUND", name: "Crystal Mountain", unlockType: "LEVEL", unlockLevel: 7, sortOrder: 4 },
  { key: "background_castle", slot: "BACKGROUND", name: "Sunny Castle", unlockType: "LEVEL", unlockLevel: 10, sortOrder: 5 },
  { key: "background_space", slot: "BACKGROUND", name: "Star Galaxy", unlockType: "LEVEL", unlockLevel: 13, sortOrder: 6 },
  { key: "sunset", slot: "BACKGROUND", name: "Sunset", unlockType: "CHEST", rarity: "rare", sortOrder: 7 },
  { key: "rainbow", slot: "BACKGROUND", name: "Rainbow", unlockType: "CHEST", rarity: "epic", sortOrder: 8 },
  // Hats
  { key: "hair_cap", slot: "HAIR", name: "Blue cap", unlockType: "LEVEL", unlockLevel: 2, sortOrder: 1 },
  { key: "hair_explorer_hat", slot: "HAIR", name: "Explorer's hat", unlockType: "LEVEL", unlockLevel: 8, sortOrder: 2 },
  { key: "hair_bow", slot: "HAIR", name: "Pink bow", unlockType: "CHEST", sortOrder: 3 },
  { key: "hair_headband", slot: "HAIR", name: "Headband", unlockType: "CHEST", sortOrder: 4 },
  // Outfits
  { key: "outfit_tee", slot: "OUTFIT", name: "Yellow tee", sortOrder: 1 },
  { key: "outfit_ranger", slot: "OUTFIT", name: "Ranger vest", unlockType: "LEVEL", unlockLevel: 5, sortOrder: 2 },
  { key: "outfit_climber", slot: "OUTFIT", name: "Climber jacket", unlockType: "LEVEL", unlockLevel: 9, sortOrder: 3 },
  { key: "outfit_royal", slot: "OUTFIT", name: "Royal cape", unlockType: "LEVEL", unlockLevel: 12, sortOrder: 4 },
  { key: "outfit_astronaut", slot: "OUTFIT", name: "Space suit", unlockType: "LEVEL", unlockLevel: 15, sortOrder: 5 },
  { key: "outfit_pajamas", slot: "OUTFIT", name: "Star pajamas", unlockType: "CHEST", sortOrder: 6 },
  // Accessories
  { key: "accessory_scarf", slot: "ACCESSORY", name: "Red scarf", unlockType: "LEVEL", unlockLevel: 3, sortOrder: 1 },
  { key: "accessory_glasses", slot: "ACCESSORY", name: "Round glasses", unlockType: "LEVEL", unlockLevel: 6, sortOrder: 2 },
  { key: "accessory_crown_small", slot: "ACCESSORY", name: "Little crown", unlockType: "LEVEL", unlockLevel: 11, sortOrder: 3 },
  { key: "accessory_helmet", slot: "ACCESSORY", name: "Space helmet", unlockType: "LEVEL", unlockLevel: 14, sortOrder: 4 },
  { key: "accessory_star_badge", slot: "ACCESSORY", name: "Star badge", unlockType: "ACHIEVEMENT", unlockAchievementKey: "golden_week", sortOrder: 5 },
  { key: "accessory_flame_pin", slot: "ACCESSORY", name: "Flame pin", unlockType: "ACHIEVEMENT", unlockAchievementKey: "streak_7", sortOrder: 6 },
  // Frames
  { key: "frame_knight", slot: "FRAME", name: "Knight's ring", unlockType: "LEVEL", unlockLevel: 10, sortOrder: 1 },
  { key: "frame_galaxy", slot: "FRAME", name: "Galaxy ring", unlockType: "LEVEL", unlockLevel: 15, sortOrder: 2 },
  { key: "frame_gold", slot: "FRAME", name: "Golden ring", unlockType: "ACHIEVEMENT", unlockAchievementKey: "golden_10", sortOrder: 3 },
];
