export interface WorldDef {
  key: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  /** Token names from the Sunrise theme used for the map band. */
  tint: string;
}

export interface LevelDef {
  number: number;
  name: string;
  xpRequired: number;
  worldKey: string;
  /** Cosmetic item keys granted on reaching the level. */
  unlocks: string[];
}

export const WORLDS: WorldDef[] = [
  { key: "home", name: "Home Village", minLevel: 1, maxLevel: 3, tint: "leaf" },
  { key: "forest", name: "Whispering Forest", minLevel: 4, maxLevel: 6, tint: "leaf" },
  { key: "mountain", name: "Crystal Mountain", minLevel: 7, maxLevel: 9, tint: "sky" },
  { key: "castle", name: "Sunny Castle", minLevel: 10, maxLevel: 12, tint: "berry" },
  { key: "space", name: "Star Galaxy", minLevel: 13, maxLevel: 15, tint: "berry" },
];

const LEVEL_NAMES: Record<number, string> = {
  1: "Sprout",
  2: "Explorer",
  3: "Helper",
  4: "Trailblazer",
  5: "Champion",
  6: "Forest Ranger",
  7: "Climber",
  8: "Summit Hero",
  9: "Mountain Master",
  10: "Knight",
  11: "Royal Guardian",
  12: "Castle Champion",
  13: "Astronaut",
  14: "Star Captain",
  15: "Galaxy Legend",
};

const LEVEL_UNLOCKS: Record<number, string[]> = {
  2: ["hair_cap"],
  3: ["accessory_scarf"],
  4: ["background_forest"],
  5: ["outfit_ranger"],
  6: ["accessory_glasses"],
  7: ["background_mountain"],
  8: ["hair_explorer_hat"],
  9: ["outfit_climber"],
  10: ["background_castle", "frame_knight"],
  11: ["accessory_crown_small"],
  12: ["outfit_royal"],
  13: ["background_space"],
  14: ["accessory_helmet"],
  15: ["frame_galaxy", "outfit_astronaut"],
};

export const MAX_DEFINED_LEVEL = 15;

/** Cumulative XP needed to *reach* level n. Each level costs 50 XP more than the last. */
export function xpRequiredFor(level: number): number {
  if (level <= 1) return 0;
  return 25 * level * (level - 1);
}

export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Legend ★${level - MAX_DEFINED_LEVEL}`;
}

export function worldForLevel(level: number): WorldDef {
  return WORLDS.find((w) => level >= w.minLevel && level <= w.maxLevel) ?? WORLDS[WORLDS.length - 1];
}

/** Level definitions 1..15 as seeded into the Level table. */
export const LEVELS: LevelDef[] = Array.from({ length: MAX_DEFINED_LEVEL }, (_, i) => {
  const number = i + 1;
  return {
    number,
    name: levelName(number),
    xpRequired: xpRequiredFor(number),
    worldKey: worldForLevel(number).key,
    unlocks: LEVEL_UNLOCKS[number] ?? [],
  };
});

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpRequiredFor(level + 1) <= xp) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  name: string;
  world: WorldDef;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpToNext: number;
  percent: number;
  nextName: string;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const currentLevelXp = xpRequiredFor(level);
  const nextLevelXp = xpRequiredFor(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const span = nextLevelXp - currentLevelXp;
  return {
    level,
    name: levelName(level),
    world: worldForLevel(level),
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpToNext: nextLevelXp - xp,
    percent: span > 0 ? Math.min(100, Math.round((xpIntoLevel / span) * 100)) : 100,
    nextName: levelName(level + 1),
  };
}
