import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, db push, seed) talks to the database directly.
// On Neon/Vercel set DIRECT_URL to the unpooled connection string; the app itself
// uses DATABASE_URL (pooled) through the driver adapter in src/lib/db/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `react-server` makes the `server-only` marker package resolve to an empty module outside Next.
    seed: "node --conditions=react-server --import tsx prisma/seed/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
