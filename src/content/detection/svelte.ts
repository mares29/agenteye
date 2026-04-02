// =============================================================================
// Svelte 5 Framework Detector
// =============================================================================
//
// Detects Svelte on the page and extracts component information.
//
// Svelte 5 dev mode sets `__svelte_meta` on DOM elements with:
//   {
//     loc: { file: string, line: number, column: number },
//     parent: DevStackEntry | null
//   }
//
// DevStackEntry is a linked list:
//   {
//     type: "component" | "if" | "each" | "await" | ...,
//     file: string,        // e.g. "src/lib/Button.svelte"
//     line: number,
//     column: number,
//     parent: DevStackEntry | null
//   }
//
// We walk the `parent` chain collecting entries where type === "component"
// to build the component hierarchy.

import type { FrameworkDetector } from "./types";
import type { FrameworkComponentInfo } from "../types";

type DevStackEntry = {
  type: string;
  file: string;
  line: number;
  column: number;
  parent: DevStackEntry | null;
};

type SvelteMeta = {
  loc: { file: string; line: number; column: number };
  parent: DevStackEntry | null;
};

/** Get __svelte_meta from a DOM element */
function getSvelteMeta(el: Element): SvelteMeta | null {
  const meta = (el as any).__svelte_meta;
  if (meta && meta.loc) return meta;
  return null;
}

/** Extract component name from a file path */
function fileToComponentName(file: string): string {
  // "src/lib/components/Button.svelte" → "Button"
  let name = file;
  if (name.includes("/") || name.includes("\\")) {
    const parts = name.split(/[/\\]/);
    name = parts[parts.length - 1];
  }
  name = name.replace(/\.svelte$/, "");
  return name;
}

/** Walk the dev_stack parent chain collecting component entries */
function walkDevStack(
  entry: DevStackEntry | null,
  maxDepth = 20,
): { names: string[]; sourceFile: string | null } {
  const names: string[] = [];
  let sourceFile: string | null = null;
  let current = entry;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (current.type === "component" && current.file) {
      const name = fileToComponentName(current.file);
      if (name.length > 2) {
        names.push(name);
        if (!sourceFile) {
          sourceFile = `${current.file}:${current.line}`;
        }
      }
    }
    current = current.parent;
    depth++;
  }

  return { names, sourceFile };
}

export const svelteDetector: FrameworkDetector = {
  name: "svelte",

  detect(): boolean {
    // Check for Svelte global (set by Svelte runtime)
    if (typeof window !== "undefined" && (window as any).__svelte) {
      return true;
    }

    // Check for __svelte_meta on elements (dev mode)
    const elements = document.querySelectorAll("body > *, body > * > *");
    for (const el of elements) {
      if (getSvelteMeta(el)) return true;
    }

    // Check for data-svelte-h hydration markers
    if (document.querySelector("[data-svelte-h]")) {
      return true;
    }

    // Check for SvelteKit markers
    if (document.querySelector("[data-sveltekit-preload-data]")) {
      return true;
    }

    return false;
  },

  getComponentInfo(el: Element): FrameworkComponentInfo | null {
    // First check the element itself for __svelte_meta
    const meta = getSvelteMeta(el);
    if (meta) {
      // Walk the parent dev_stack chain for component hierarchy
      const { names, sourceFile } = walkDevStack(meta.parent);

      // The element's own loc gives us the source file of the template
      const elementSource = `${meta.loc.file}:${meta.loc.line}`;
      const elementComponentName = fileToComponentName(meta.loc.file);

      // Prepend the element's own component if not already in the list
      if (names.length === 0 || names[0] !== elementComponentName) {
        names.unshift(elementComponentName);
      }

      if (names.length === 0) return null;

      return {
        framework: "svelte",
        hierarchy: names.map((n) => `<${n}>`).join(" "),
        sourceFile: sourceFile ?? elementSource,
      };
    }

    // Walk up DOM to find nearest element with __svelte_meta
    let current: Element | null = el.parentElement;
    let depth = 0;
    while (current && depth < 20) {
      const parentMeta = getSvelteMeta(current);
      if (parentMeta) {
        const { names, sourceFile } = walkDevStack(parentMeta.parent);
        const elementComponentName = fileToComponentName(parentMeta.loc.file);
        if (names.length === 0 || names[0] !== elementComponentName) {
          names.unshift(elementComponentName);
        }
        if (names.length === 0) return null;
        return {
          framework: "svelte",
          hierarchy: names.map((n) => `<${n}>`).join(" "),
          sourceFile:
            sourceFile ?? `${parentMeta.loc.file}:${parentMeta.loc.line}`,
        };
      }
      current = current.parentElement;
      depth++;
    }

    return null;
  },
};
