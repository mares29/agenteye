import * as esbuild from "esbuild";
import path from "path";
import { cpSync, mkdirSync, readFileSync } from "fs";

const isWatch = process.argv.includes("--watch");

// Plugin to handle ?raw imports (inline file contents as string)
const rawImportPlugin: esbuild.Plugin = {
  name: "raw-import",
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/, "")),
      namespace: "raw",
    }));
    build.onLoad({ filter: /.*/, namespace: "raw" }, (args) => ({
      contents: `export default ${JSON.stringify(readFileSync(args.path, "utf-8"))}`,
      loader: "js",
    }));
  },
};

const shared: esbuild.BuildOptions = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: "chrome120",
  format: "iife", // Content scripts need IIFE, not ESM
  plugins: [rawImportPlugin],
};

// Content script (isolated world)
const contentBuild = esbuild.build({
  ...shared,
  entryPoints: ["src/content/index.ts"],
  outfile: "dist/content/index.js",
});

// Bridge script (MAIN world — accesses page JS like __svelte_meta)
const bridgeBuild = esbuild.build({
  ...shared,
  entryPoints: ["src/content/detection/bridge.ts"],
  outfile: "dist/content/bridge.js",
});

// Background service worker (can be ESM in Manifest V3 but IIFE is safer)
const backgroundBuild = esbuild.build({
  ...shared,
  entryPoints: ["src/background/index.ts"],
  outfile: "dist/background/index.js",
});

// Popup
const popupBuild = esbuild.build({
  ...shared,
  entryPoints: ["src/popup/popup.ts"],
  outfile: "dist/popup/popup.js",
});

await Promise.all([contentBuild, bridgeBuild, backgroundBuild, popupBuild]);

// Copy static files
mkdirSync("dist", { recursive: true });
mkdirSync("dist/icons", { recursive: true });
cpSync("manifest.json", "dist/manifest.json");
cpSync("src/popup/index.html", "dist/popup/index.html");
cpSync("icons", "dist/icons", { recursive: true });

console.log("Build complete → dist/");
