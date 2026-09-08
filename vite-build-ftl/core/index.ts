import { writeFileSync, readdirSync } from "fs";
import { resolve, parse } from "path";
import { uploadCdnFn } from "../assets/utils.js";
import { mkdirp } from "mkdirp";

import type { Plugin } from "vite";
import type { OutputAsset, OutputBundle } from "rollup";
import type { BuildFTLProps, ManifestJSON } from "./types";
import { covertSrc, getAppName, merge } from "./utils.js";

export default ({ ftlDir, entryDir }: BuildFTLProps): Plugin => {
  mkdirp.sync(ftlDir);

  return {
    name: "vite:buildFTL",
    apply: "build",
    config(config) {
      if (!entryDir) return {};
      const fileList = readdirSync(resolve(process.cwd(), entryDir));
      const mapInput = (inputOptions: Record<string, string>, file: string) => {
        if (parse(file).ext !== ".html") return inputOptions;
        inputOptions[parse(file).name] = resolve(process.cwd(), entryDir, file);
        return inputOptions;
      };
      const input = fileList.reduce<Record<string, string>>(mapInput, {});
      const options = { build: { rollupOptions: { input }, manifest: true } };
      return merge(options, config as any);
    },
    async writeBundle(options, _bundle) {
      const bundle = _bundle as OutputBundle & {
        "manifest.json": OutputAsset;
        ".vite/manifest.json": OutputAsset;
      };
      const manifest = bundle["manifest.json"] || bundle[".vite/manifest.json"];

      const manifestJSON: ManifestJSON = JSON.parse(manifest.source as string);
      for (const key in manifestJSON) {
        const value = manifestJSON[key];
        if (!value.isEntry) continue;

        const enterHTML = (bundle[value.src] || bundle[covertSrc(value.src)]) as OutputAsset;
        const filename = bundle[value.file].name;

        writeFileSync(resolve(process.cwd(), ftlDir, filename + ".ftl"), enterHTML!.source);
      }

      // production
      const fileList = Object.keys(bundle);

      uploadCdnFn(fileList, options.dir);
    },
  };
};

// test
// export const publicPath = `/`;

// production
export const publicPath = `https://file.yzcdn.cn/mall-cloud/${getAppName()}/`;
