// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { reactDetector } from "../../src/content/detection/react";

/** Create a mock React component function with a name */
function mockComponent(name: string, displayName?: string): Function {
  // Use Object.defineProperty to set .name on the function
  const fn = function () {};
  Object.defineProperty(fn, "name", { value: name });
  if (displayName) {
    (fn as any).displayName = displayName;
  }
  return fn;
}

describe("reactDetector", () => {
  describe("detect", () => {
    afterEach(() => {
      delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      document.body.innerHTML = "";
    });

    it("returns false when no React is present", () => {
      expect(reactDetector.detect()).toBe(false);
    });

    it("returns true when React DevTools hook exists", () => {
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = { renderers: new Map() };
      expect(reactDetector.detect()).toBe(true);
    });

    it("returns true when element has React fiber key", () => {
      const el = document.createElement("div");
      el.id = "root";
      (el as any).__reactFiber$abc123 = { tag: 0, type: "div" };
      document.body.appendChild(el);

      expect(reactDetector.detect()).toBe(true);
      document.body.removeChild(el);
    });
  });

  describe("getComponentInfo", () => {
    it("returns null for elements without fiber", () => {
      const el = document.createElement("div");
      expect(reactDetector.getComponentInfo(el)).toBeNull();
    });

    it("extracts component hierarchy from fiber tree", () => {
      const el = document.createElement("button");

      // Simulate a React fiber tree: Button -> Card -> App
      // In real React, fiber.type is the component function
      const appFiber = {
        tag: 0,
        type: mockComponent("App"),
        return: null,
      };
      const cardFiber = {
        tag: 0,
        type: mockComponent("Card"),
        return: appFiber,
      };
      const buttonFiber = {
        tag: 0,
        type: mockComponent("Button"),
        return: cardFiber,
      };

      (el as any).__reactFiber$test = buttonFiber;

      const info = reactDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.framework).toBe("react");
      expect(info!.hierarchy).toContain("<Button>");
      expect(info!.hierarchy).toContain("<Card>");
      expect(info!.hierarchy).toContain("<App>");
    });

    it("uses displayName when available", () => {
      const el = document.createElement("div");
      const fiber = {
        tag: 0,
        type: mockComponent("c", "StyledButton"),
        return: null,
      };
      (el as any).__reactFiber$test = fiber;

      const info = reactDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.hierarchy).toContain("<StyledButton>");
    });

    it("skips framework internals", () => {
      const el = document.createElement("div");
      const fragmentFiber = {
        tag: 0,
        type: mockComponent("Fragment"),
        return: null,
      };
      const componentFiber = {
        tag: 0,
        type: mockComponent("MyComponent"),
        return: fragmentFiber,
      };
      (el as any).__reactFiber$test = componentFiber;

      const info = reactDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.hierarchy).not.toContain("Fragment");
      expect(info!.hierarchy).toContain("<MyComponent>");
    });

    it("skips minified names", () => {
      const el = document.createElement("div");
      const fiber = {
        tag: 0,
        type: mockComponent("x"), // single letter = minified
        return: {
          tag: 0,
          type: mockComponent("Dashboard"),
          return: null,
        },
      };
      (el as any).__reactFiber$test = fiber;

      const info = reactDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.hierarchy).not.toContain("<x>");
      expect(info!.hierarchy).toContain("<Dashboard>");
    });

    it("extracts source file from _debugSource", () => {
      const el = document.createElement("div");
      const fiber = {
        tag: 0,
        type: mockComponent("Button"),
        _debugSource: { fileName: "src/Button.tsx", lineNumber: 42 },
        return: null,
      };
      (el as any).__reactFiber$test = fiber;

      const info = reactDetector.getComponentInfo(el);
      expect(info).not.toBeNull();
      expect(info!.sourceFile).toBe("src/Button.tsx:42");
    });
  });
});
