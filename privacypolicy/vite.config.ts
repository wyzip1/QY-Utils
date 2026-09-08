// vite.config.js

import { resolve } from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import electron from "vite-plugin-electron";
import electronRenderer from "vite-plugin-electron-renderer";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    vue(),
    AutoImport({
      imports: ["vue"],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: "src/auto-imports.d.ts",
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
      ],
    }),
    electron([{ entry: "electron/main.ts" }, { entry: "electron/preload.ts" }]),
    electronRenderer(),
  ],
  publicDir: "public",
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  css: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
});
