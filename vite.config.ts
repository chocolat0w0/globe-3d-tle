import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import { readFileSync } from "fs";
import type { Plugin as EsbuildPlugin } from "esbuild";

// Cesiumにバンドルされたサードパーティライブラリのeval除去パッチ。
// unsafe-eval なしのCSPで動作させるために必要。
// Vite のdep pre-bundling は esbuild で行われるため、
// optimizeDeps.esbuildOptions.plugins で対応する必要がある。
//
// パッチ対象:
// 1. protobuf.js: eval("quire".replace(...)) → null  (require()取得の難読化、常にnullを返す)
// 2. Knockout.js: (0, eval)("this") → globalThis    (グローバルオブジェクト取得の旧式パターン)
const PROTOBUF_EVAL_RE = /eval\("quire"\.replace\([^)]+\)\)\(\w+\)/g;
const KNOCKOUT_EVAL_RE = /\(0,\s*eval\)\("this"\)/g;

function patchEvals(source: string): string {
  return source
    .replace(PROTOBUF_EVAL_RE, "null")
    .replace(KNOCKOUT_EVAL_RE, "globalThis");
}

const patchCesiumEvalsEsbuild: EsbuildPlugin = {
  name: "patch-cesium-evals",
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const source = readFileSync(args.path, "utf-8");
      if (!source.includes('eval')) return undefined;
      const patched = patchEvals(source);
      if (patched === source) return undefined;
      return { contents: patched, loader: "js" };
    });
  },
};

export default defineConfig({
  plugins: [react(), cesium()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [patchCesiumEvalsEsbuild],
    },
  },
  server: {
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
        "worker-src 'self' blob:",
        "img-src 'self' data: blob:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "connect-src 'self'",
        "font-src 'self' data: https://fonts.gstatic.com",
      ].join("; "),
    },
    proxy: {
      "/tiles": {
        target: "https://osm.tellusxdp.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tiles/, "/osm"),
      },
    },
  },
});
