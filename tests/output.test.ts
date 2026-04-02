import { describe, it, expect } from "vitest";
import { generateOutput } from "../src/content/output";
import type { Annotation } from "../src/content/types";

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "test-1",
    x: 50,
    y: 100,
    comment: "Fix this button color",
    element: 'button "Submit"',
    elementPath: "form > button.submit",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("generateOutput", () => {
  it("returns no annotations message when empty", () => {
    expect(generateOutput([], "/")).toBe("No annotations.");
  });

  describe("compact", () => {
    it("generates single-line output", () => {
      const output = generateOutput([makeAnnotation()], "/page", "compact");
      expect(output).toContain('1. **button "Submit"**');
      expect(output).toContain("Fix this button color");
    });

    it("includes source file when available", () => {
      const output = generateOutput(
        [makeAnnotation({ sourceFile: "src/Button.tsx:42" })],
        "/page",
        "compact",
      );
      expect(output).toContain("(src/Button.tsx:42)");
    });

    it("includes selected text when available", () => {
      const output = generateOutput(
        [makeAnnotation({ selectedText: "Hello world" })],
        "/page",
        "compact",
      );
      expect(output).toContain('"Hello world"');
    });
  });

  describe("standard", () => {
    it("generates structured output", () => {
      const output = generateOutput([makeAnnotation()], "/page", "standard");
      expect(output).toContain("# Feedback for `/page`");
      expect(output).toContain('## 1. button "Submit"');
      expect(output).toContain("`form > button.submit`");
      expect(output).toContain("> Fix this button color");
    });

    it("includes framework info", () => {
      const output = generateOutput(
        [
          makeAnnotation({
            frameworkInfo: {
              framework: "react",
              hierarchy: "<Button> <App>",
            },
          }),
        ],
        "/page",
        "standard",
      );
      expect(output).toContain("**react:**");
      expect(output).toContain("<Button> <App>");
    });
  });

  describe("detailed", () => {
    it("includes CSS classes and bounding box", () => {
      const output = generateOutput(
        [
          makeAnnotation({
            cssClasses: "btn btn-primary",
            boundingBox: { x: 10, y: 20, width: 100, height: 40 },
          }),
        ],
        "/page",
        "detailed",
      );
      expect(output).toContain("`btn btn-primary`");
      expect(output).toContain("10,20 100x40");
    });
  });

  describe("forensic", () => {
    it("includes full DOM path and computed styles", () => {
      const output = generateOutput(
        [
          makeAnnotation({
            fullPath: "html > body > div > form > button",
            computedStyles: "font-size: 14px; color: red",
            accessibility: 'role="button", focusable',
          }),
        ],
        "/page",
        "forensic",
      );
      expect(output).toContain("`html > body > div > form > button`");
      expect(output).toContain("font-size: 14px; color: red");
      expect(output).toContain('role="button", focusable');
    });
  });

  it("handles multiple annotations", () => {
    const annotations = [
      makeAnnotation({ id: "1", comment: "First issue" }),
      makeAnnotation({
        id: "2",
        comment: "Second issue",
        element: 'link "Home"',
      }),
    ];
    const output = generateOutput(annotations, "/page", "standard");
    expect(output).toContain("## 1.");
    expect(output).toContain("## 2.");
    expect(output).toContain("First issue");
    expect(output).toContain("Second issue");
  });
});
