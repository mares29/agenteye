import { describe, it, expect, vi } from "vitest";
import { Emitter } from "../src/content/emitter";

type TestEvents = {
  click: (x: number, y: number) => void;
  change: (value: string) => void;
};

describe("Emitter", () => {
  it("calls handler when event is emitted", () => {
    const emitter = new Emitter<TestEvents>();
    const handler = vi.fn();
    emitter.on("click", handler);
    emitter.emit("click", 10, 20);
    expect(handler).toHaveBeenCalledWith(10, 20);
  });

  it("supports multiple handlers for the same event", () => {
    const emitter = new Emitter<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on("click", h1);
    emitter.on("click", h2);
    emitter.emit("click", 5, 5);
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("returns unsubscribe function", () => {
    const emitter = new Emitter<TestEvents>();
    const handler = vi.fn();
    const unsub = emitter.on("change", handler);
    emitter.emit("change", "a");
    expect(handler).toHaveBeenCalledOnce();

    unsub();
    emitter.emit("change", "b");
    expect(handler).toHaveBeenCalledOnce(); // not called again
  });

  it("does nothing when emitting an event with no listeners", () => {
    const emitter = new Emitter<TestEvents>();
    // Should not throw
    emitter.emit("click", 0, 0);
  });

  it("removeAll clears all listeners", () => {
    const emitter = new Emitter<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on("click", h1);
    emitter.on("change", h2);
    emitter.removeAll();
    emitter.emit("click", 0, 0);
    emitter.emit("change", "x");
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });
});
