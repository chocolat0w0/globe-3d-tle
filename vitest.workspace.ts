import { defineWorkspace } from "vitest/config";

/**
 * Vitestワークスペース設定
 *
 * - unit-node : DOM不要の純ロジックテスト（node環境・setupFiles不要）
 * - unit-jsdom: Reactコンポーネント・フックのテスト（jsdom環境）
 *
 * 共通設定（globals, timeout, coverage）は vitest.config.ts から継承する。
 */
export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "unit-node",
      environment: "node",
      include: [
        "tests/unit/**/*.test.ts",
        "src/lib/**/__tests__/**/*.test.ts",
      ],
      setupFiles: [],
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "unit-jsdom",
      environment: "jsdom",
      include: [
        "src/components/**/__tests__/**/*.{test.ts,test.tsx}",
        "src/hooks/**/__tests__/**/*.test.ts",
      ],
      setupFiles: ["src/test-setup.ts"],
    },
  },
]);
