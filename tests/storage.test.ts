// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadAnnotations,
  saveAnnotations,
  clearAnnotations,
  loadSettings,
  saveSettings,
} from "../src/content/storage";
import type { Annotation } from "../src/content/types";

// Tests use localStorage fallback (no chrome.storage in test env)

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "test-1",
    x: 50,
    y: 100,
    comment: "Test",
    element: "button",
    elementPath: "button",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("storage (localStorage fallback)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("annotations", () => {
    it("returns empty array when no annotations stored", async () => {
      const result = await loadAnnotations("/page");
      expect(result).toEqual([]);
    });

    it("saves and loads annotations", async () => {
      const annotations = [makeAnnotation()];
      await saveAnnotations("/page", annotations);
      const loaded = await loadAnnotations("/page");
      expect(loaded).toHaveLength(1);
      expect(loaded[0].comment).toBe("Test");
    });

    it("isolates annotations by pathname", async () => {
      await saveAnnotations("/page-a", [makeAnnotation({ id: "a" })]);
      await saveAnnotations("/page-b", [makeAnnotation({ id: "b" })]);

      const a = await loadAnnotations("/page-a");
      const b = await loadAnnotations("/page-b");
      expect(a[0].id).toBe("a");
      expect(b[0].id).toBe("b");
    });

    it("clears annotations for a pathname", async () => {
      await saveAnnotations("/page", [makeAnnotation()]);
      await clearAnnotations("/page");
      const loaded = await loadAnnotations("/page");
      expect(loaded).toEqual([]);
    });

    it("filters expired annotations (older than 7 days)", async () => {
      const fresh = makeAnnotation({ id: "fresh", timestamp: Date.now() });
      const expired = makeAnnotation({
        id: "expired",
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
      });

      await saveAnnotations("/page", [fresh, expired]);
      const loaded = await loadAnnotations("/page");
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("fresh");
    });

    it("handles corrupted localStorage gracefully", async () => {
      localStorage.setItem("agenteye:annotations:/page", "not-json");
      const loaded = await loadAnnotations("/page");
      expect(loaded).toEqual([]);
    });
  });

  describe("settings", () => {
    it("returns defaults when no settings stored", async () => {
      const defaults = { detail: "standard", frozen: false };
      const loaded = await loadSettings(defaults);
      expect(loaded).toEqual(defaults);
    });

    it("merges saved settings with defaults", async () => {
      await saveSettings({ detail: "forensic" });
      const loaded = await loadSettings({ detail: "standard", frozen: false });
      expect(loaded.detail).toBe("forensic");
      expect(loaded.frozen).toBe(false);
    });

    it("handles corrupted settings gracefully", async () => {
      localStorage.setItem("agenteye:settings", "{broken");
      const loaded = await loadSettings({ detail: "standard" });
      expect(loaded.detail).toBe("standard");
    });
  });
});
