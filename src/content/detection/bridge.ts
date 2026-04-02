// =============================================================================
// Framework Detection Bridge (runs in MAIN world)
// =============================================================================
//
// Content scripts run in an isolated JavaScript context and CANNOT access
// properties set by page JavaScript (like __svelte_meta or __reactFiber$).
//
// This script runs in the page's MAIN world and bridges framework metadata
// to the content script via a custom DOM attribute (data-agenteye-meta)
// and a custom event system.
//
// Flow:
// 1. Content script dispatches "agenteye:detect-request" on document
// 2. This bridge detects frameworks and dispatches "agenteye:detect-response"
// 3. Content script dispatches "agenteye:element-info" with element coordinates
// 4. This bridge reads __svelte_meta / __reactFiber$ and responds

// =============================================================================
// Svelte 5 Detection
// =============================================================================

function getSvelteComponentInfo(el: Element): any | null {
  const meta = (el as any).__svelte_meta;
  if (!meta?.loc) {
    // Walk up DOM to find nearest element with __svelte_meta
    let current: Element | null = el.parentElement;
    let depth = 0;
    while (current && depth < 20) {
      if ((current as any).__svelte_meta?.loc) {
        return extractSvelteInfo((current as any).__svelte_meta);
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }
  return extractSvelteInfo(meta);
}

function extractSvelteInfo(meta: any): any {
  const names: string[] = [];
  let sourceFile: string | null = null;

  // Element's own component from loc.file
  const locFile = meta.loc?.file;
  if (locFile) {
    const name = fileToName(locFile);
    names.push(name);
    sourceFile = `${locFile}:${meta.loc.line}`;
  }

  // Walk parent dev_stack
  let current = meta.parent;
  let depth = 0;
  while (current && depth < 20) {
    if (current.type === "component") {
      const name =
        current.componentTag ||
        (current.file ? fileToName(current.file) : null);
      if (name && name.length > 1) {
        names.push(name);
        if (!sourceFile && current.file) {
          sourceFile = `${current.file}:${current.line}`;
        }
      }
    }
    current = current.parent;
    depth++;
  }

  if (names.length === 0) return null;
  return {
    framework: "svelte",
    hierarchy: names.map((n) => `<${n}>`).join(" "),
    sourceFile,
  };
}

// =============================================================================
// React Detection
// =============================================================================

function getReactComponentInfo(el: Element): any | null {
  const fiberKey = Object.getOwnPropertyNames(el).find(
    (k) =>
      k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  if (!fiberKey) return null;

  const fiber = (el as any)[fiberKey];
  if (!fiber) return null;

  const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15, 16]);
  const SKIP = new Set([
    "Fragment",
    "Suspense",
    "StrictMode",
    "Profiler",
    "RenderedRoute",
    "Router",
    "Routes",
    "RouterProvider",
  ]);

  const names: string[] = [];
  let sourceFile: string | null = null;
  let current = fiber;
  let depth = 0;

  while (current && depth < 15) {
    if (COMPONENT_TAGS.has(current.tag)) {
      let name: string | null = null;
      if (typeof current.type === "function") {
        name = current.type.displayName || current.type.name || null;
      } else if (typeof current.type === "object" && current.type !== null) {
        const sym = current.type.$$typeof?.toString();
        if (sym === "Symbol(react.memo)") {
          const inner = current.type.type;
          name =
            typeof inner === "function"
              ? inner.displayName || inner.name
              : null;
        } else if (sym === "Symbol(react.forward_ref)") {
          const render = current.type.render;
          name =
            typeof render === "function"
              ? render.displayName || render.name
              : null;
        }
      }
      if (name && !SKIP.has(name) && name.length > 2) {
        names.push(name);
        if (!sourceFile && current._debugSource) {
          const s = current._debugSource;
          sourceFile = s.lineNumber
            ? `${s.fileName}:${s.lineNumber}`
            : s.fileName;
        }
      }
    }
    current = current.return;
    depth++;
  }

  if (names.length === 0) return null;
  return {
    framework: "react",
    hierarchy: names.map((n) => `<${n}>`).join(" "),
    sourceFile,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function fileToName(file: string): string {
  let name = file;
  if (name.includes("/") || name.includes("\\")) {
    name = name.split(/[/\\]/).pop()!;
  }
  return name.replace(/\.svelte$|\.tsx?$|\.jsx?$/, "");
}

// =============================================================================
// Event Bridge
// =============================================================================

// Detect frameworks
function detectFrameworks(): string[] {
  const detected: string[] = [];
  if ((window as any).__svelte) detected.push("svelte");
  if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) detected.push("react");
  // Check DOM for framework markers
  if (!detected.includes("svelte")) {
    const els = document.querySelectorAll("body > *, body > * > *");
    for (const el of els) {
      if ((el as any).__svelte_meta) {
        detected.push("svelte");
        break;
      }
    }
  }
  if (!detected.includes("react")) {
    const els = document.querySelectorAll("body > *, body > * > *");
    for (const el of els) {
      const keys = Object.getOwnPropertyNames(el);
      if (keys.some((k) => k.startsWith("__reactFiber$"))) {
        detected.push("react");
        break;
      }
    }
  }
  return detected;
}

// Listen for detection requests from content script
document.addEventListener("agenteye:detect-request", () => {
  const frameworks = detectFrameworks();
  document.dispatchEvent(
    new CustomEvent("agenteye:detect-response", { detail: { frameworks } }),
  );
});

// Listen for element info requests
document.addEventListener("agenteye:element-info", (e: Event) => {
  const { x, y } = (e as CustomEvent).detail;
  const el = document.elementFromPoint(x, y);
  if (!el) {
    document.dispatchEvent(
      new CustomEvent("agenteye:element-info-response", { detail: null }),
    );
    return;
  }

  // Try Svelte first, then React
  const info = getSvelteComponentInfo(el) || getReactComponentInfo(el);
  document.dispatchEvent(
    new CustomEvent("agenteye:element-info-response", { detail: info }),
  );
});

// Also respond to hover requests (higher frequency)
document.addEventListener("agenteye:hover-info", (e: Event) => {
  const { x, y } = (e as CustomEvent).detail;
  const el = document.elementFromPoint(x, y);
  if (!el) {
    document.dispatchEvent(
      new CustomEvent("agenteye:hover-info-response", { detail: null }),
    );
    return;
  }
  const info = getSvelteComponentInfo(el) || getReactComponentInfo(el);
  document.dispatchEvent(
    new CustomEvent("agenteye:hover-info-response", { detail: info }),
  );
});
