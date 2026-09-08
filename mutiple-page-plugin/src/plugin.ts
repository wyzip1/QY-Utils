import { Plugin } from "vite";
import { MultiPageAutoOptions } from "./types";
import { defaultTemplate } from "./html";
import { findEntryPoints, type EntryPoint } from "./entry";
import { DEFAULT_IGNORE_PATTERNS } from "./config";
import { covertSrc, getPathSplitter } from "./utils";

export default function MultiPageAutoPlugin(
  options: MultiPageAutoOptions = {}
): Plugin {
  const {
    ignore: customIgnore = [],
    entry: entryConfig,
    pageConfig,
    head = [],
    body = [],
    template
  } = options;

  const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...customIgnore];
  const htmlCache = new Map<string, string>();
  const entryPoints = new Map<string, EntryPoint>();

  return {
    name: "vite-plugin-multipage-auto",

    resolveId(id) {
      if (id.endsWith(".html")) {
        return id;
      }
    },

    async load(id) {
      if (id.endsWith(".html")) {
        const cached = htmlCache.get(id);
        if (cached) return cached;

        const pageName = covertSrc(id)
          .replace(process.cwd() + getPathSplitter(id), "")
          .split(".")[0];
        const entry = entryPoints.get(pageName);
        
        if (!entry) return null;
        const config = pageConfig?.[entry.pageName];
        const templateFn = config?.template || template || defaultTemplate;
        const html = templateFn({
          title: config?.title || entry.pageName,
          scriptPath: entry.entryPath,
          head: head.concat(config?.head|| []),
          body: body.concat(config?.body || []),
        });

        htmlCache.set(id, html);
        return html;
      }
    },

    config: async () => {
      const entries = await findEntryPoints(ignorePatterns, entryConfig);
      const input: Record<string, string> = {};

      entries.forEach(entry => {
        input[entry.pageName] = entry.htmlPath;
        entryPoints.set(entry.pageName, entry);
      });

      return {
        build: {
          rollupOptions: { input }
        }
      };
    }
  };
}