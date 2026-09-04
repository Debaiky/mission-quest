import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mission Quest",
    short_name: "Missions",
    description: "Daily missions, streaks and rewards for families.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F7FF",
    theme_color: "#3F7BEA",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
