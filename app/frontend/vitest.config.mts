import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite resolves the "@/*" alias from tsconfig.json itself.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: "./",
    include: ["test/**/*.spec.ts"],
  },
});
