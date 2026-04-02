// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { svelteDetector } from "../../src/content/detection/svelte";

describe("svelteDetector", () => {
  afterEach(() => {
    delete (window as any).__svelte;
    // Clean up DOM
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
      (el as any).__svelte_meta = { name: "App" };
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

    it("extracts component name from __svelte_meta", () => {
      const el = document.createElement("div");
      (el as any).__svelte_meta = { name: "Button" };

      const info = svelteDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.framework).toBe("svelte");
      expect(info!.hierarchy).toContain("<Button>");
    });

    it("cleans file path component names", () => {
      const el = document.createElement("div");
      (el as any).__svelte_meta = { name: "src/lib/Button.svelte" };

      const info = svelteDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.hierarchy).toContain("<Button>");
      expect(info!.hierarchy).not.toContain("src/lib");
      expect(info!.hierarchy).not.toContain(".svelte");
    });

    it("extracts source file from loc", () => {
      const el = document.createElement("div");
      (el as any).__svelte_meta = {
        name: "Card",
        loc: { file: "src/Card.svelte", line: 10 },
      };

      const info = svelteDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.sourceFile).toBe("src/Card.svelte:10");
    });

    it("walks up parent tree collecting components", () => {
      const parent = document.createElement("div");
      (parent as any).__svelte_meta = { name: "Layout" };

      const child = document.createElement("button");
      (child as any).__svelte_meta = { name: "Button" };
      parent.appendChild(child);

      const info = svelteDetector.getComponentInfo(child);
      expect(info).not.toBeNull();
      expect(info!.hierarchy).toContain("<Button>");
      expect(info!.hierarchy).toContain("<Layout>");
    });
  });
});
