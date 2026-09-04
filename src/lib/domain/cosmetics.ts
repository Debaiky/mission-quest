/** Shared between the server (data layer) and client (avatar editor). No database imports here. */

export type CosmeticSlotLite = "BASE" | "SKIN" | "HAIR" | "OUTFIT" | "ACCESSORY" | "BACKGROUND" | "FRAME";

export interface CosmeticOption {
  key: string;
  name: string;
  slot: CosmeticSlotLite;
  owned: boolean;
  unlockHint: string | null;
}

export const SLOT_LABELS: Record<CosmeticSlotLite, string> = {
  BASE: "Character",
  SKIN: "Colour",
  HAIR: "Hats",
  OUTFIT: "Outfits",
  ACCESSORY: "Accessories",
  BACKGROUND: "Backgrounds",
  FRAME: "Frames",
};
