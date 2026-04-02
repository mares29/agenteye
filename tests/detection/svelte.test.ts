// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { svelteDetector } from "../../src/content/detection/svelte";

describe("svelteDetector", () => {
  afterEach(() => {
    delete (window as any).__svelte;
    document.body.innerHTML = "";
  });

  describe("detect", () => {
    it("returns false when no Svelte is present", () => {
      expect(svelteDetector.detect()).toBe(false);
    });

    it("returns true when __svelte global exists", () => {
      (window as any).__svelte = { v: new Set(["5"]) };
      expect(svelteDetector.detect()).toBe(true);
    });

    it("returns true when data-svelte-h attribute exists", () => {
      const el = document.createElement("div");
      el.setAttribute("data-svelte-h", "svelte-abc123");
      document.body.appendChild(el);
      expect(svelteDetector.detect()).toBe(true);
    });

    it("returns true when __svelte_meta exists on elements", () => {
      const el = document.createElement("div");
      (el as any).__svelte_meta = {
        loc: { file: "src/App.svelte", line: 1, column: 0 },
        parent: null,
      };
      document.body.appendChild(el);
      expect(svelteDetector.detect()).toBe(true);
    });

    it("detects SvelteKit markers", () => {
      const el = document.createElement("div");
      el.setAttribute("data-sveltekit-preload-data", "hover");
      document.body.appendChild(el);
      expect(svelteDetector.detect()).toBe(true);
    });
  });

  describe("getComponentInfo", () => {
    it("returns null for elements without Svelte metadata", () => {
      const el = document.createElement("div");
      expect(svelteDetector.getComponentInfo(el)).toBeNull();
    });

    it("extracts component name from __svelte_meta.loc.file", () => {
      const el = document.createElement("button");
      (el as any).__svelte_meta = {
        loc: { file: "src/lib/Button.svelte", line: 5, column: 2 },
        parent: null,
      };

      const info = svelteDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.framework).toBe("svelte");
      expect(info!.hierarchy).toContain("<Button>");
    });

    it("walks parent dev_stack for component hierarchy", () => {
      const el = document.createElement("button");

      // Simulate Svelte 5 dev_stack: Button is inside Card, which is inside App
      const appEntry = {
        type: "component",
        file: "src/App.svelte",
        line: 1,
        column: 0,
        parent: null,
      };
      const cardEntry = {
        type: "component",
        file: "src/lib/Card.svelte",
        line: 3,
        column: 4,
        parent: appEntry,
      };

      (el as any).__svelte_meta = {
        loc: { file: "src/lib/Button.svelte", line: 8, column: 2 },
        parent: cardEntry,
      };

      const info = svelteDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.hierarchy).toContain("<Button>");
      expect(info!.hierarchy).toContain("<Card>");
      expect(info!.hierarchy).toContain("<App>");
    });

    it("skips non-component entries in dev_stack (if, each)", () => {
      const el = document.createElement("div");

      const appEntry = {
        type: "component",
        file: "src/App.svelte",
        line: 1,
        column: 0,
        parent: null,
      };
      const ifEntry = {
        type: "if",
        file: "src/App.svelte",
        line: 10,
        column: 2,
        parent: appEntry,
      };

      (el as any).__svelte_meta = {
        loc: { file: "src/App.svelte", line: 11, column: 4 },
        parent: ifEntry,
      };

      const info = svelteDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      // Should only contain App, not "if"
      expect(info!.hierarchy).toBe("<App>");
    });

    it("extracts source file from dev_stack", () => {
      const el = document.createElement("div");
      const componentEntry = {
        type: "component",
        file: "src/lib/Card.svelte",
        line: 10,
        column: 0,
        parent: null,
      };

      (el as any).__svelte_meta = {
        loc: { file: "src/lib/Card.svelte", line: 15, column: 4 },
        parent: componentEntry,
      };

      const info = svelteDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.sourceFile).toBe("src/lib/Card.svelte:10");
    });

    it("walks up DOM to find nearest element with __svelte_meta", () => {
      const parent = document.createElement("div");
      (parent as any).__svelte_meta = {
        loc: { file: "src/lib/Layout.svelte", line: 3, column: 0 },
        parent: null,
      };

      const child = document.createElement("span");
      parent.appendChild(child);

      const info = svelteDetector.getComponentInfo(child);
      expect(info).not.toBeNull();
      expect(info!.hierarchy).toContain("<Layout>");
    });
  });
});
