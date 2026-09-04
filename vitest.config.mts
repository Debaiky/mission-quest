import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // Integration tests share one database; keep them sequential.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The `server-only` marker throws outside React Server Components; tests run services directly.
      "server-only": path.resolve(__dirname, "tests/empty.ts"),
    },
  },
});
