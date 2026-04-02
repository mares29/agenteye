import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAgentEye, type AgentEyeEngine } from "../src/content/engine";

// Mock storage to avoid chrome.storage / localStorage dependency
vi.mock("../src/content/storage", () => ({
  loadAnnotations: vi.fn().mockResolvedValue([]),
  saveAnnotations: vi.fn().mockResolvedValue(undefined),
  clearAnnotations: vi.fn().mockResolvedValue(undefined),
  loadSettings: vi
    .fn()
    .mockResolvedValue({ outputDetail: "standard", clearAfterCopy: false }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
}));

describe("AgentEyeEngine", () => {
  let engine: AgentEyeEngine;

  beforeEach(() => {
    engine = createAgentEye();
  });

  describe("activation", () => {
    it("starts inactive", () => {
      expect(engine.getState().active).toBe(false);
    });

    it("activates", () => {
      engine.activate();
      expect(engine.getState().active).toBe(true);
    });

    it("deactivates and clears hover/pending", () => {
      engine.activate();
      engine.setHoverInfo({
        element: {} as Element,
        name: "button",
        path: "button.primary",
        boundingBox: { x: 0, y: 0, width: 100, height: 30 },
      });
      engine.deactivate();
      const state = engine.getState();
      expect(state.active).toBe(false);
      expect(state.hoverInfo).toBeNull();
      expect(state.pendingAnnotation).toBeNull();
    });

    it("emits active:change event", () => {
      const handler = vi.fn();
      engine.on("active:change", handler);
      engine.activate();
      expect(handler).toHaveBeenCalledWith(true);
      engine.deactivate();
      expect(handler).toHaveBeenCalledWith(false);
    });

    it("does not re-emit when already active", () => {
      const handler = vi.fn();
      engine.activate();
      engine.on("active:change", handler);
      engine.activate();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("annotations", () => {
    const sampleInput = {
      x: 50,
      y: 100,
      comment: "Fix this button",
      element: 'button "Submit"',
      elementPath: "form > button.submit",
    };

    it("adds annotation with generated id and timestamp", () => {
      const annotation = engine.addAnnotation(sampleInput);
      expect(annotation.id).toBeTruthy();
      expect(annotation.timestamp).toBeGreaterThan(0);
      expect(annotation.comment).toBe("Fix this button");
      expect(engine.getState().annotations).toHaveLength(1);
    });

    it("emits annotation:add event", () => {
      const handler = vi.fn();
      engine.on("annotation:add", handler);
      const annotation = engine.addAnnotation(sampleInput);
      expect(handler).toHaveBeenCalledWith(annotation);
    });

    it("clears pending annotation after adding", () => {
      engine.setPendingAnnotation({
        x: 50,
        y: 100,
        element: "button",
        elementPath: "button",
        boundingBox: { x: 0, y: 0, width: 100, height: 30 },
      });
      expect(engine.getState().pendingAnnotation).not.toBeNull();
      engine.addAnnotation(sampleInput);
      expect(engine.getState().pendingAnnotation).toBeNull();
    });

    it("updates annotation by id", () => {
      const annotation = engine.addAnnotation(sampleInput);
      engine.updateAnnotation(annotation.id, { comment: "Updated" });
      expect(engine.getState().annotations[0].comment).toBe("Updated");
    });

    it("emits annotation:update event", () => {
      const handler = vi.fn();
      engine.on("annotation:update", handler);
      const annotation = engine.addAnnotation(sampleInput);
      engine.updateAnnotation(annotation.id, { comment: "Updated" });
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ comment: "Updated" }),
      );
    });

    it("ignores update for non-existent id", () => {
      const handler = vi.fn();
      engine.on("annotation:update", handler);
      engine.updateAnnotation("nonexistent", { comment: "nope" });
      expect(handler).not.toHaveBeenCalled();
    });

    it("deletes annotation by id", () => {
      const annotation = engine.addAnnotation(sampleInput);
      engine.deleteAnnotation(annotation.id);
      expect(engine.getState().annotations).toHaveLength(0);
    });

    it("emits annotation:delete event", () => {
      const handler = vi.fn();
      engine.on("annotation:delete", handler);
      const annotation = engine.addAnnotation(sampleInput);
      engine.deleteAnnotation(annotation.id);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: annotation.id }),
      );
    });

    it("clears all annotations", () => {
      engine.addAnnotation(sampleInput);
      engine.addAnnotation({ ...sampleInput, comment: "Second" });
      engine.clearAnnotations();
      expect(engine.getState().annotations).toHaveLength(0);
    });

    it("does not emit clear when already empty", () => {
      const handler = vi.fn();
      engine.on("annotations:clear", handler);
      engine.clearAnnotations();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("freeze", () => {
    it("toggles frozen state", () => {
      engine.setFrozen(true);
      expect(engine.getState().frozen).toBe(true);
      engine.setFrozen(false);
      expect(engine.getState().frozen).toBe(false);
    });

    it("emits freeze:change event", () => {
      const handler = vi.fn();
      engine.on("freeze:change", handler);
      engine.setFrozen(true);
      expect(handler).toHaveBeenCalledWith(true);
    });

    it("does not re-emit when value unchanged", () => {
      const handler = vi.fn();
      engine.on("freeze:change", handler);
      engine.setFrozen(false); // already false
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("output detail", () => {
    it("defaults to standard", () => {
      expect(engine.getState().outputDetail).toBe("standard");
    });

    it("can be configured", () => {
      const e = createAgentEye({ outputDetail: "forensic" });
      expect(e.getState().outputDetail).toBe("forensic");
    });

    it("updates output detail level", () => {
      engine.setOutputDetail("detailed");
      expect(engine.getState().outputDetail).toBe("detailed");
    });
  });

  describe("state:change", () => {
    it("emits with current and previous state", () => {
      const handler = vi.fn();
      engine.on("state:change", handler);
      engine.activate();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ active: true }),
        expect.objectContaining({ active: false }),
      );
    });

    it("returns independent state snapshots", () => {
      const state1 = engine.getState();
      engine.addAnnotation({
        x: 0,
        y: 0,
        comment: "test",
        element: "div",
        elementPath: "div",
      });
      const state2 = engine.getState();
      expect(state1.annotations).toHaveLength(0);
      expect(state2.annotations).toHaveLength(1);
    });
  });

  describe("destroy", () => {
    it("removes all event listeners", () => {
      const handler = vi.fn();
      engine.on("active:change", handler);
      engine.destroy();
      engine.activate();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("settings persistence", () => {
    it("calls saveSettings when outputDetail changes", async () => {
      const { saveSettings } = await import("../src/content/storage");
      vi.mocked(saveSettings).mockClear();
      engine.setOutputDetail("forensic");
      expect(saveSettings).toHaveBeenCalledWith({
        outputDetail: "forensic",
        clearAfterCopy: false,
      });
    });

    it("calls saveSettings when clearAfterCopy changes", async () => {
      const { saveSettings } = await import("../src/content/storage");
      vi.mocked(saveSettings).mockClear();
      engine.setClearAfterCopy(true);
      expect(saveSettings).toHaveBeenCalledWith({
        outputDetail: "standard",
        clearAfterCopy: true,
      });
    });

    it("does not call saveSettings when value unchanged", async () => {
      const { saveSettings } = await import("../src/content/storage");
      vi.mocked(saveSettings).mockClear();
      engine.setOutputDetail("standard"); // already standard
      engine.setClearAfterCopy(false); // already false
      expect(saveSettings).not.toHaveBeenCalled();
    });

    it("loads persisted settings and emits state:change", async () => {
      const { loadSettings } = await import("../src/content/storage");
      vi.mocked(loadSettings).mockResolvedValueOnce({
        outputDetail: "detailed",
        clearAfterCopy: true,
      });

      const handler = vi.fn();
      const e = createAgentEye();
      e.on("state:change", handler);

      // Wait for async load
      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalled();
      });

      const state = e.getState();
      expect(state.outputDetail).toBe("detailed");
      expect(state.clearAfterCopy).toBe(true);
    });

    it("does not emit state:change when persisted settings match defaults", async () => {
      const { loadSettings } = await import("../src/content/storage");
      vi.mocked(loadSettings).mockResolvedValueOnce({
        outputDetail: "standard",
        clearAfterCopy: false,
      });

      const handler = vi.fn();
      const e = createAgentEye();
      e.on("state:change", handler);

      // Give the promise time to resolve
      await new Promise((r) => setTimeout(r, 10));
      // The only state:change calls should be from annotation loading (none here)
      // No settings-triggered change expected
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
