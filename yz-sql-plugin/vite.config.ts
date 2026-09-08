import { defineConfig } from "vite";
import { resolve } from "path";

import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import monkey, { util } from "vite-plugin-monkey";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({
      imports: ["vue", util.unimportPreset],
      include: [/\.ts$/, /\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: "src/auto-imports.d.ts",
      resolvers: [AntDesignVueResolver()],
    }),
    Components({ resolvers: [AntDesignVueResolver({ importStyle: false })] }),
    monkey({
      entry: "src/main.ts",
      userscript: {
        icon: "https://vitejs.dev/logo.svg",
        namespace: "npm/vite-plugin-monkey",
        match: ["https://diy.youzanyun.com/rds*"],
      },
      server: { mountGmApi: true },
    }),
  ],
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
    extensions: [".js", ".tsx", ".vue", ".jsx", ".ts", ".mjs"],
  },
  css: {
    postcss: { plugins: [tailwindcss, autoprefixer] },
  },
}));
