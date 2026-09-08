import { defineConfig } from "vite";
import { resolve } from "path";
import buildFTL, { publicPath } from "../core/index";

// https://vitejs.dev/config/
/* eslint-env node */
export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : publicPath,
  plugins: [buildFTL({ ftlDir: "./output2", entryDir: "./test/entry" })],
  build: {
    // 启用manifest.json 文件
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "./index.html"),
      },
      output: {
        dir: "./output",
      },
    },
  },
}));
