// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  identifyElement,
  getElementPath,
  getNearbyElements,
  getNearbyText,
  getCssClasses,
  getAccessibilityInfo,
  getFullElementPath,
  getParentElement,
  isInShadowDOM,
} from "../src/content/dom/element-id";

// Mock DOM environment
function createElement(
  tag: string,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") {
      el.className = value;
    } else {
      el.setAttribute(key, value);
    }
  }
  if (text) el.textContent = text;
  return el;
}

// vitest uses jsdom-like env by default in node, but we don't have
// full DOM. These tests use basic DOM APIs that work in happy-dom/jsdom.
// For CI, configure vitest with happy-dom environment.

describe("identifyElement", () => {
  it("identifies a button with text", () => {
    const btn = createElement("button", {}, "Save");
    const { name } = identifyElement(btn);
    expect(name).toBe('button "Save"');
  });

  it("identifies a button without text", () => {
    const btn = createElement("button");
    const { name } = identifyElement(btn);
    expect(name).toBe("button");
  });

  it("identifies a link with text", () => {
    const a = createElement("a", { href: "/about" }, "About Us");
    const { name } = identifyElement(a);
    expect(name).toBe('link "About Us"');
  });

  it("identifies an input with placeholder", () => {
    const input = createElement("input", {
      type: "email",
      placeholder: "Enter email",
    });
    const { name } = identifyElement(input);
    expect(name).toBe('email input "Enter email"');
  });

  it("identifies a heading", () => {
    const h1 = createElement("h1", {}, "Welcome");
    const { name } = identifyElement(h1);
    expect(name).toBe('h1 "Welcome"');
  });

  it("identifies an image with alt text", () => {
    const img = createElement("img", { alt: "Company logo" });
    const { name } = identifyElement(img);
    expect(name).toBe('image "Company logo"');
  });

  it("identifies by aria-label", () => {
    const div = createElement("div", { "aria-label": "Navigation" });
    const { name } = identifyElement(div);
    expect(name).toBe('div "Navigation"');
  });

  it("identifies by id", () => {
    const div = createElement("div", { id: "sidebar" });
    const { name } = identifyElement(div);
    expect(name).toBe("div#sidebar");
  });

  it("identifies by class", () => {
    const div = createElement("div", { className: "card featured" });
    const { name } = identifyElement(div);
    expect(name).toBe("div.card.featured");
  });

  it("truncates long text", () => {
    const btn = createElement(
      "button",
      {},
      "This is a very long button text that should be truncated",
    );
    const { name } = identifyElement(btn);
    expect(name.length).toBeLessThan(60);
    expect(name).toContain("\u2026"); // ellipsis
  });

  it("identifies element with role=button", () => {
    const span = createElement("span", { role: "button" }, "Click me");
    const { name } = identifyElement(span);
    expect(name).toBe('button "Click me"');
  });
});

describe("getCssClasses", () => {
  it("returns space-separated class names", () => {
    const el = createElement("div", { className: "card featured primary" });
    expect(getCssClasses(el)).toBe("card featured primary");
  });

  it("returns empty string for no classes", () => {
    const el = createElement("div");
    expect(getCssClasses(el)).toBe("");
  });
});

describe("getAccessibilityInfo", () => {
  it("collects aria attributes", () => {
    const el = createElement("button", {
      role: "tab",
      "aria-label": "Settings",
      tabindex: "0",
    });
    const info = getAccessibilityInfo(el);
    expect(info).toContain('role="tab"');
    expect(info).toContain('aria-label="Settings"');
    expect(info).toContain("tabindex=0");
  });

  it("returns empty for plain elements", () => {
    const el = createElement("div");
    expect(getAccessibilityInfo(el)).toBe("");
  });
});

describe("getParentElement", () => {
  it("returns regular parent", () => {
    const parent = createElement("div");
    const child = createElement("span");
    parent.appendChild(child);
    expect(getParentElement(child)).toBe(parent);
  });

  it("returns null for detached element", () => {
    const el = createElement("div");
    expect(getParentElement(el)).toBeNull();
  });
});

describe("getNearbyElements", () => {
  it("returns sibling descriptions", () => {
    const parent = createElement("div");
    const s1 = createElement("span", {}, "First");
    const target = createElement("button", {}, "Target");
    const s2 = createElement("span", {}, "Last");
    parent.append(s1, target, s2);

    const nearby = getNearbyElements(target);
    expect(nearby).toContain("First");
    expect(nearby).toContain("Last");
  });
});

describe("getNearbyText", () => {
  it("includes element text in brackets", () => {
    const parent = createElement("div");
    const prev = createElement("p", {}, "Before");
    const target = createElement("p", {}, "Target");
    const next = createElement("p", {}, "After");
    parent.append(prev, target, next);

    const text = getNearbyText(target);
    expect(text).toContain("[Target]");
    expect(text).toContain("Before");
    expect(text).toContain("After");
  });
});
