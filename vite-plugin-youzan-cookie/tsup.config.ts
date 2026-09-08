import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    outDir: "dist",
    format: ["esm"],
    platform: "node",
    target: "node18",
    dts: false,
    sourcemap: true,
    clean: true,
    splitting: false,
  },
  {
    entry: { cli: "src/cli.ts", "native-host": "src/native-host.ts" },
    outDir: "dist",
    format: ["esm"],
    platform: "node",
    target: "node18",
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: {
      "extension/service-worker": "src/extension/service-worker.ts",
      "extension/popup": "src/extension/popup.ts",
    },
    outDir: "dist",
    format: ["esm"],
    platform: "browser",
    target: "chrome109",
    dts: false,
    sourcemap: false,
    clean: false,
    splitting: false,
  },
]);
