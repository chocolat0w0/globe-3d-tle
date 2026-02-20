import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    proxy: {
      "/tiles": {
        target: "https://osm.tellusxdp.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tiles/, "/osm"),
      },
    },
  },
});
