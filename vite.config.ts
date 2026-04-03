import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import { readFileSync } from "fs";
import type { Plugin as EsbuildPlugin } from "esbuild";

// Cesiumにバンドルされたサードパーティライブラリのeval除去パッチ。
// unsafe-eval なしのCSPで動作させるために必要。
//
// パッチ対象:
// 1. protobuf.js: eval("quire".replace(...)) → null  (require()取得の難読化、常にnullを返す)
// 2. Knockout.js: (0, eval)("this") → globalThis    (グローバルオブジェクト取得の旧式パターン)
//
// dev:   optimizeDeps.esbuildOptions.plugins で esbuild の onLoad に介入
// build: rebuildCesium: true により Rollup がソースを処理するため
//        Vite の transform フックで介入
const PROTOBUF_EVAL_RE = /eval\("quire"\.replace\([^)]+\)\)\(\w+\)/g;
const KNOCKOUT_EVAL_RE = /\(0,\s*eval\)\("this"\)/g;

function patchEvals(source: string): string {
  return source
    .replace(PROTOBUF_EVAL_RE, "null")
    .replace(KNOCKOUT_EVAL_RE, "globalThis");
}

// build 用: Rollup が各ソースファイルを読む際に transform フックで介入
function patchCesiumEvalsVite(): Plugin {
  return {
    name: "patch-cesium-evals-vite",
    enforce: "pre",
    transform(code) {
      if (!code.includes("eval")) return null;
      const patched = patchEvals(code);
      if (patched === code) return null;
      return { code: patched, map: null };
    },
  };
}

// dev 用: esbuild による dep pre-bundling の onLoad に介入
const patchCesiumEvalsEsbuild: EsbuildPlugin = {
  name: "patch-cesium-evals-esbuild",
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const source = readFileSync(args.path, "utf-8");
      if (!source.includes("eval")) return undefined;
      const patched = patchEvals(source);
      if (patched === source) return undefined;
      return { contents: patched, loader: "js" };
    });
  },
};

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "connect-src 'self'",
  "font-src 'self' data: https://fonts.gstatic.com",
].join("; ");

export default defineConfig({
  plugins: [patchCesiumEvalsVite(), react(), cesium({ rebuildCesium: true })],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [patchCesiumEvalsEsbuild],
    },
  },
  server: {
    headers: { "Content-Security-Policy": CSP_DIRECTIVES },
    proxy: {
      "/tiles": {
        target: "https://osm.tellusxdp.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tiles/, "/osm"),
      },
    },
  },
  preview: {
    headers: { "Content-Security-Policy": CSP_DIRECTIVES },
  },
});
