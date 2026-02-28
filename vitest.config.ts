import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  test: {
    globals: true,
    // environment と setupFiles はワークスペース（vitest.workspace.ts）で設定する
    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 3_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/test-setup.ts",
        "src/main.tsx",
        "src/**/*.stories.{ts,tsx}",
      ],
    },
  },
});
