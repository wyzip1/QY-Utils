# VITE-BUILD-FTL

```ts
import { defineConfig } from "vite";
import { resolve } from "path";
import buildFTL, { publicPath } from "../src/index";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : publicPath,
  plugins: [buildFTL({ ftlDir: "./dist2", entryDir: "./test/entry" })],
  build: {
    // 启用manifest.json 文件
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "./index.html"),
      },
    },
  },
}));
```