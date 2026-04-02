// =============================================================================
// React Framework Detector
// =============================================================================
//
// Detects React on the page and extracts component hierarchy by traversing
// React's internal fiber tree. Works with React 16-19.
// Pure DOM access — no React import needed.

import type { FrameworkDetector } from "./types";
import type { FrameworkComponentInfo } from "../types";

// React fiber tags for component types
const FUNCTION_COMPONENT = 0;
const CLASS_COMPONENT = 1;
const FORWARD_REF = 11;
const MEMO = 14;
const SIMPLE_MEMO = 15;
const LAZY = 16;

const COMPONENT_TAGS = new Set([
  FUNCTION_COMPONENT,
  CLASS_COMPONENT,
  FORWARD_REF,
  MEMO,
  SIMPLE_MEMO,
  LAZY,
]);

// Framework internals to skip
const SKIP_NAMES = new Set([
  "Fragment",
  "Suspense",
  "StrictMode",
  "Profiler",
  "RenderedRoute",
  "MemoryRouter",
  "Router",
  "Routes",
  "RouterProvider",
]);

const SKIP_PATTERNS = [
  /^Provider$/,
  /^Consumer$/,
  /Context\./,
  /^Lazy$/,
  /^InternalComponent$/,
];

/** Get the React fiber key from a DOM element */
function getFiberKey(el: Element): string | null {
  // Object.getOwnPropertyNames catches properties that Object.keys misses
  // on DOM elements (especially in test environments like happy-dom)
  const keys = Object.getOwnPropertyNames(el);
  for (const key of keys) {
    if (
      key.startsWith("__reactFiber$") ||
      key.startsWith("__reactInternalInstance$")
    ) {
      return key;
    }
  }
  return null;
}

/** Get fiber from DOM element */
function getFiber(el: Element): any | null {
  const key = getFiberKey(el);
  return key ? (el as any)[key] : null;
}

/** Extract component name from a fiber */
function getComponentName(fiber: any): string | null {
  if (!fiber || !fiber.type) return null;

  // Function or class component
  if (typeof fiber.type === "function") {
    return fiber.type.displayName || fiber.type.name || null;
  }

  // ForwardRef
  if (typeof fiber.type === "object" && fiber.type !== null) {
    // Memo wrapping
    if (fiber.type.$$typeof?.toString() === "Symbol(react.memo)") {
      const inner = fiber.type.type;
      return typeof inner === "function"
        ? inner.displayName || inner.name
        : null;
    }
    // ForwardRef
    if (fiber.type.$$typeof?.toString() === "Symbol(react.forward_ref)") {
      const render = fiber.type.render;
      return typeof render === "function"
        ? render.displayName || render.name
        : null;
    }
  }

  return null;
}

/** Check if a name should be skipped */
function shouldSkip(name: string): boolean {
  if (SKIP_NAMES.has(name)) return true;
  if (SKIP_PATTERNS.some((p) => p.test(name))) return true;
  // Skip minified names (single/double letter)
  if (name.length <= 2) return true;
  return false;
}

/** Extract source file from fiber's _debugSource (dev mode only) */
function getSourceFile(fiber: any): string | null {
  const source = fiber?._debugSource;
  if (!source) return null;

  const fileName = source.fileName;
  if (!fileName) return null;

  const line = source.lineNumber;
  return line ? `${fileName}:${line}` : fileName;
}

/** Walk up the fiber tree collecting component names */
function walkFiberTree(
  fiber: any,
  maxDepth = 15,
): { names: string[]; sourceFile: string | null } {
  const names: string[] = [];
  let sourceFile: string | null = null;
  let current = fiber;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (COMPONENT_TAGS.has(current.tag)) {
      const name = getComponentName(current);
      if (name && !shouldSkip(name)) {
        names.push(name);
        // Capture source file from the nearest component
        if (!sourceFile) {
          sourceFile = getSourceFile(current);
        }
      }
    }
    current = current.return;
    depth++;
  }

  return { names, sourceFile };
}

export const reactDetector: FrameworkDetector = {
  name: "react",

  detect(): boolean {
    // Check for React DevTools hook (set by React when it mounts)
    if (
      typeof window !== "undefined" &&
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
    ) {
      return true;
    }

    // Check for React fiber keys on any element
    const testEl = document.querySelector("[class], [id], body > *");
    if (testEl && getFiberKey(testEl)) return true;

    // Check body and its immediate children
    const children = document.body?.children;
    if (children) {
      for (let i = 0; i < Math.min(children.length, 5); i++) {
        if (getFiberKey(children[i])) return true;
      }
    }

    return false;
  },

  getComponentInfo(el: Element): FrameworkComponentInfo | null {
    const fiber = getFiber(el);
    if (!fiber) return null;

    const { names, sourceFile } = walkFiberTree(fiber);
    if (names.length === 0) return null;

    // Build hierarchy string: innermost first, then ancestors
    const hierarchy = names.map((n) => `<${n}>`).join(" ");

    return {
      framework: "react",
      hierarchy,
      sourceFile: sourceFile ?? undefined,
    };
  },
};
