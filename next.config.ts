import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Postgres driver and Prisma adapter run in Node only; never bundle them.
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@node-rs/argon2", "web-push"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
