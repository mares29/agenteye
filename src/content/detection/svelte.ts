// =============================================================================
// Svelte 5 Framework Detector
// =============================================================================
//
// Detects Svelte on the page and extracts component information.
// Svelte 5 uses runes internally but still annotates DOM elements
// with component metadata in dev mode.
//
// Detection strategies:
// 1. __svelte_meta (Svelte dev mode annotation)
// 2. data-svelte-h (Svelte hydration markers)
// 3. $$root / __svelte_component__ on elements

import type { FrameworkDetector } from "./types";
import type { FrameworkComponentInfo } from "../types";

/** Check for Svelte metadata on a DOM element */
function getSvelteMeta(el: Element): any | null {
  // Svelte 5 dev mode: __svelte_meta
  if ((el as any).__svelte_meta) {
    return (el as any).__svelte_meta;
  }

  // Svelte 4 and earlier: __svelte_component__
  if ((el as any).__svelte_component__) {
    return { component: (el as any).__svelte_component__ };
  }

  return null;
}

/** Walk up the DOM collecting Svelte component names */
function walkSvelteTree(
  el: Element,
  maxDepth = 15,
): { names: string[]; sourceFile: string | null } {
  const names: string[] = [];
  let sourceFile: string | null = null;
  let current: Element | null = el;
  let depth = 0;

  while (current && depth < maxDepth) {
    const meta = getSvelteMeta(current);
    if (meta) {
      // Extract component name
      const name = extractComponentName(meta);
      if (name) {
        names.push(name);
        if (!sourceFile && meta.loc) {
          sourceFile = `${meta.loc.file}:${meta.loc.line}`;
        }
      }
    }

    current = current.parentElement;
    depth++;
  }

  return { names, sourceFile };
}

/** Extract a component name from Svelte metadata */
function extractComponentName(meta: any): string | null {
  // Svelte 5: meta.name or meta.component
  if (meta.name && typeof meta.name === "string") {
    return cleanComponentName(meta.name);
  }

  // Constructor-based (Svelte 4)
  if (meta.component?.constructor?.name) {
    const name = meta.component.constructor.name;
    if (name !== "Object" && name.length > 2) {
      return name;
    }
  }

  return null;
}

/** Clean up component name (remove file paths, extensions) */
function cleanComponentName(name: string): string {
  // If it's a file path like "src/lib/Button.svelte", extract "Button"
  if (name.includes("/") || name.includes("\\")) {
    const parts = name.split(/[/\\]/);
    name = parts[parts.length - 1];
  }
  // Remove .svelte extension
  name = name.replace(/\.svelte$/, "");
  return name;
}

export const svelteDetector: FrameworkDetector = {
  name: "svelte",

  detect(): boolean {
    // Check for Svelte dev tools
    if (typeof window !== "undefined" && (window as any).__svelte) {
      return true;
    }

    // Check for data-svelte-h hydration markers
    if (document.querySelector("[data-svelte-h]")) {
      return true;
    }

    // Check for __svelte_meta on elements
    const elements = document.querySelectorAll("body > *, body > * > *");
    for (const el of elements) {
      if (getSvelteMeta(el)) return true;
    }

    // Check for Svelte's SvelteKit markers
    if (document.querySelector("[data-sveltekit-preload-data]")) {
      return true;
    }

    return false;
  },

  getComponentInfo(el: Element): FrameworkComponentInfo | null {
    const { names, sourceFile } = walkSvelteTree(el);
    if (names.length === 0) return null;

    const hierarchy = names.map((n) => `<${n}>`).join(" ");

    return {
      framework: "svelte",
      hierarchy,
      sourceFile: sourceFile ?? undefined,
    };
  },
};
