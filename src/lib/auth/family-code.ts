import { randomInt } from "node:crypto";

// Two kid-friendly words + two digits: ~ 60 × 60 × 100 = 360,000 codes, combined with
// the rate limiter that is plenty for a code that only reveals first names + avatars.
const WORDS = [
  "SUNNY", "HAPPY", "BRAVE", "LUCKY", "MIGHTY", "SWIFT", "JOLLY", "CLEVER", "SPARKY", "COSMIC",
  "FOX", "BEAR", "OWL", "PANDA", "BUNNY", "TIGER", "KOALA", "OTTER", "PUFFIN", "DOLPHIN",
  "MAPLE", "RIVER", "CLOUD", "STAR", "MOON", "COMET", "PEBBLE", "ACORN", "MEADOW", "HARBOR",
  "ROCKET", "CASTLE", "FOREST", "ISLAND", "GARDEN", "SUMMIT", "BREEZE", "CANYON", "GLACIER", "LAGOON",
  "PIXEL", "MARBLE", "BUTTON", "WAFFLE", "PICKLE", "NOODLE", "MUFFIN", "COOKIE", "BUBBLE", "PUZZLE",
  "AMBER", "CORAL", "INDIGO", "OLIVE", "SCARLET", "VIOLET", "GOLDEN", "SILVER", "COBALT", "CRIMSON",
];

export function generateFamilyCode(): string {
  const a = WORDS[randomInt(WORDS.length)];
  let b = WORDS[randomInt(WORDS.length)];
  while (b === a) b = WORDS[randomInt(WORDS.length)];
  const n = String(randomInt(10, 100));
  return `${a}-${b}-${n}`;
}

/** Accepts "sunny fox 42", "SUNNY-FOX-42", "sunny_fox42"… and returns the canonical form. */
export function normalizeFamilyCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const m = cleaned.match(/^([A-Z]+)-?([A-Z]+)-?(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return cleaned;
}

export function isPlausibleFamilyCode(value: string): boolean {
  return /^[A-Z]{3,10}-[A-Z]{3,10}-\d{2}$/.test(value);
}
