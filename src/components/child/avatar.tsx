import type { AvatarConfig } from "@/types/domain";

/**
 * Layered SVG avatar. Every layer is keyed by a CosmeticItem key so unlocks map 1:1.
 * No photos, no uploads — privacy by construction.
 */

const COLORS: Record<string, { body: string; ear: string; belly: string }> = {
  orange: { body: "#F59A4A", ear: "#E9782E", belly: "#FFF3E6" },
  brown: { body: "#A9714B", ear: "#8B5A3C", belly: "#E9C9A8" },
  grey: { body: "#8E9BB5", ear: "#6B7A99", belly: "#F2F5FF" },
  cream: { body: "#F1DFC2", ear: "#D9C2A0", belly: "#FFF8EE" },
  blue: { body: "#7FA6F0", ear: "#5B84D6", belly: "#EAF1FF" },
  pink: { body: "#F4A6C0", ear: "#E07AA0", belly: "#FFEFF5" },
  mint: { body: "#7ED3B2", ear: "#4FB58E", belly: "#EAFBF3" },
};

const BACKGROUNDS: Record<string, { fill: string; stars?: boolean }> = {
  sky: { fill: "#DCE8FF" },
  meadow: { fill: "#DDF5EA" },
  forest: { fill: "#BFE8CF" },
  mountain: { fill: "#E3ECFA" },
  castle: { fill: "#ECE4FF" },
  space: { fill: "#1E2650", stars: true },
  sunset: { fill: "#FFE4D9" },
  rainbow: { fill: "url(#mq-rainbow)" },
};

const FRAMES: Record<string, string> = {
  frame_knight: "#B8C2D6",
  frame_galaxy: "#8B5CF6",
  frame_gold: "#E3A008",
};

export function Avatar({ config, size = 64, className, title }: { config: AvatarConfig; size?: number; className?: string; title?: string }) {
  const c = COLORS[config.color] ?? COLORS.orange;
  const bg = BACKGROUNDS[config.background] ?? BACKGROUNDS.sky;
  const frame = config.frame ? FRAMES[config.frame] : undefined;
  const ink = "#1F2A44";

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label={title ?? "Avatar"}>
      <defs>
        <linearGradient id="mq-rainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD6E0" />
          <stop offset="0.5" stopColor="#FFF1C2" />
          <stop offset="1" stopColor="#CFE9FF" />
        </linearGradient>
        <clipPath id="mq-clip">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill={bg.fill} />
      {bg.stars ? (
        <g fill="#FFF1D6">
          <circle cx="12" cy="14" r="1.4" />
          <circle cx="50" cy="10" r="1" />
          <circle cx="56" cy="30" r="1.2" />
          <circle cx="8" cy="40" r="1" />
          <circle cx="44" cy="54" r="1.3" />
        </g>
      ) : null}
      <g clipPath="url(#mq-clip)">
        <Base base={config.base} color={c} ink={ink} />
        <Outfit outfit={config.outfit} />
        <Accessory accessory={config.accessory} />
        <Hair hair={config.hair} />
      </g>
      {frame ? <circle cx="32" cy="32" r="30.5" fill="none" stroke={frame} strokeWidth="3" /> : null}
    </svg>
  );
}

function Base({ base, color, ink }: { base: string; color: { body: string; ear: string; belly: string }; ink: string }) {
  const eyes = (
    <>
      <circle cx="25" cy="34" r="2.6" fill={ink} />
      <circle cx="39" cy="34" r="2.6" fill={ink} />
    </>
  );
  switch (base) {
    case "bear":
      return (
        <>
          <circle cx="17" cy="20" r="8" fill={color.ear} />
          <circle cx="47" cy="20" r="8" fill={color.ear} />
          <circle cx="32" cy="36" r="19" fill={color.body} />
          <ellipse cx="32" cy="43" rx="9" ry="6.5" fill={color.belly} />
          {eyes}
          <ellipse cx="32" cy="41" rx="2.6" ry="2" fill={ink} />
        </>
      );
    case "cat":
      return (
        <>
          <path d="M15 28 18 10l12 12zM49 28 46 10 34 22z" fill={color.ear} />
          <circle cx="32" cy="36" r="18" fill={color.body} />
          <ellipse cx="32" cy="43" rx="9" ry="6" fill={color.belly} />
          {eyes}
          <path d="M30 40h4l-2 2.5z" fill={ink} />
          <path d="M12 40h9M12 44l9-1M43 40h9M43 43l9 1" stroke={ink} strokeWidth="1" strokeLinecap="round" opacity=".5" />
        </>
      );
    case "panda":
      return (
        <>
          <circle cx="17" cy="20" r="8" fill="#1F2A44" />
          <circle cx="47" cy="20" r="8" fill="#1F2A44" />
          <circle cx="32" cy="36" r="19" fill="#F8FAFF" />
          <ellipse cx="25" cy="34" rx="5" ry="6" fill="#1F2A44" />
          <ellipse cx="39" cy="34" rx="5" ry="6" fill="#1F2A44" />
          <circle cx="25.5" cy="34" r="1.8" fill="#fff" />
          <circle cx="38.5" cy="34" r="1.8" fill="#fff" />
          <ellipse cx="32" cy="42" rx="2.6" ry="2" fill="#1F2A44" />
        </>
      );
    case "owl":
      return (
        <>
          <path d="M16 22 20 8l10 12zM48 22 44 8 34 20z" fill={color.ear} />
          <circle cx="32" cy="36" r="19" fill={color.body} />
          <circle cx="25" cy="34" r="6.5" fill="#fff" />
          <circle cx="39" cy="34" r="6.5" fill="#fff" />
          <circle cx="25" cy="34" r="3" fill={ink} />
          <circle cx="39" cy="34" r="3" fill={ink} />
          <path d="M29 41h6l-3 4z" fill="#F5A623" />
          <ellipse cx="32" cy="50" rx="8" ry="5" fill={color.belly} />
        </>
      );
    case "bunny":
      return (
        <>
          <ellipse cx="22" cy="14" rx="5" ry="13" fill={color.body} />
          <ellipse cx="42" cy="14" rx="5" ry="13" fill={color.body} />
          <ellipse cx="22" cy="14" rx="2.5" ry="9" fill="#FFD6E0" />
          <ellipse cx="42" cy="14" rx="2.5" ry="9" fill="#FFD6E0" />
          <circle cx="32" cy="38" r="17" fill={color.body} />
          <ellipse cx="32" cy="45" rx="8" ry="5.5" fill={color.belly} />
          {eyes}
          <path d="M30 41h4l-2 2.5z" fill="#E07AA0" />
        </>
      );
    case "fox":
    default:
      return (
        <>
          <path d="M14 26 19 9l12 11zM50 26 45 9 33 20z" fill={color.ear} />
          <circle cx="32" cy="36" r="18" fill={color.body} />
          <ellipse cx="32" cy="43" rx="10" ry="7" fill={color.belly} />
          {eyes}
          <circle cx="32" cy="41" r="2.2" fill={ink} />
        </>
      );
  }
}

function Hair({ hair }: { hair?: string }) {
  switch (hair) {
    case "hair_cap":
      return <path d="M17 24c3-9 27-9 30 0l-3-1c-7-3-17-3-24 0zM44 22h8v3h-8z" fill="#3F7BEA" />;
    case "hair_explorer_hat":
      return (
        <>
          <path d="M12 26h40v3H12z" fill="#8B5A3C" />
          <path d="M18 26c2-10 26-10 28 0z" fill="#A9714B" />
          <path d="M19 23h26v3H19z" fill="#5B3B26" />
        </>
      );
    case "hair_bow":
      return <path d="M40 16l7-4v9zM40 16l-7-4v9zM38 14h4v4h-4z" fill="#E07AA0" />;
    case "hair_headband":
      return <path d="M16 24c4-6 28-6 32 0v3c-4-5-28-5-32 0z" fill="#8B5CF6" />;
    default:
      return null;
  }
}

function Outfit({ outfit }: { outfit?: string }) {
  switch (outfit) {
    case "outfit_ranger":
      return (
        <>
          <path d="M8 64c2-10 12-14 24-14s22 4 24 14z" fill="#2DB07A" />
          <circle cx="24" cy="56" r="2.5" fill="#F5A623" />
        </>
      );
    case "outfit_climber":
      return (
        <>
          <path d="M8 64c2-10 12-14 24-14s22 4 24 14z" fill="#3F7BEA" />
          <path d="M14 58c8-3 28-3 36 0" stroke="#F5A623" strokeWidth="2" fill="none" />
        </>
      );
    case "outfit_royal":
      return (
        <>
          <path d="M6 64c2-12 12-16 26-16s24 4 26 16z" fill="#E5484D" />
          <path d="M22 50h20v3H22z" fill="#F5A623" />
        </>
      );
    case "outfit_astronaut":
      return (
        <>
          <path d="M8 64c2-10 12-14 24-14s22 4 24 14z" fill="#F2F5FF" />
          <rect x="26" y="54" width="12" height="6" rx="2" fill="#6B7A99" />
        </>
      );
    case "outfit_pajamas":
      return (
        <>
          <path d="M8 64c2-10 12-14 24-14s22 4 24 14z" fill="#DCE8FF" />
          <g fill="#8B5CF6"><circle cx="20" cy="58" r="1.5" /><circle cx="32" cy="55" r="1.5" /><circle cx="44" cy="58" r="1.5" /></g>
        </>
      );
    case "outfit_tee":
      return <path d="M8 64c2-10 12-14 24-14s22 4 24 14z" fill="#F5A623" />;
    default:
      return null;
  }
}

function Accessory({ accessory }: { accessory?: string }) {
  switch (accessory) {
    case "accessory_scarf":
      return <path d="M18 48c6 3 22 3 28 0v5c-6 3-22 3-28 0zM40 52l4 8-6-2z" fill="#E5484D" />;
    case "accessory_glasses":
      return (
        <g fill="none" stroke="#1F2A44" strokeWidth="2">
          <circle cx="25" cy="34" r="6" />
          <circle cx="39" cy="34" r="6" />
          <path d="M31 34h2" />
        </g>
      );
    case "accessory_crown_small":
      return <path d="M24 12l4 5 4-7 4 7 4-5-1.5 10h-13z" fill="#E3A008" />;
    case "accessory_helmet":
      return (
        <>
          <path d="M14 34c0-14 36-14 36 0v4H14z" fill="#F2F5FF" opacity=".9" />
          <path d="M18 30c2-6 26-6 28 0v6H18z" fill="#6B9BFF" opacity=".55" />
        </>
      );
    case "accessory_star_badge":
      return <path d="m46 44 1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="#F5A623" />;
    case "accessory_flame_pin":
      return <path d="M18 44c.6 2.6 3.4 3.8 3.4 7a3.4 3.4 0 0 1-6.8 0c0-1.3.7-2.2.7-2.2s.5.8 1.3.8c-.2-2.3 1.2-3.7 1.4-5.6z" fill="#FF6B35" />;
    default:
      return null;
  }
}

export const AVATAR_BASES = ["fox", "bear", "cat", "panda", "owl", "bunny"] as const;
export const AVATAR_COLORS = Object.keys(COLORS);
export const AVATAR_BACKGROUNDS = Object.keys(BACKGROUNDS);
