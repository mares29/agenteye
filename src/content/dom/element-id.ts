// =============================================================================
// Element Identification
// =============================================================================
//
// Pure DOM utilities for identifying elements: generating human-readable names,
// CSS selector paths, and extracting contextual information.
// Supports shadow DOM traversal.

import type { BoundingBox } from "../types";

// =============================================================================
// Shadow DOM Helpers
// =============================================================================

export function getParentElement(el: Element): Element | null {
  const parent = el.parentElement;
  if (parent) return parent;
  // Cross shadow boundary
  const root = el.getRootNode();
  if (root instanceof ShadowRoot) return root.host;
  return null;
}

export function isInShadowDOM(el: Element): boolean {
  return el.getRootNode() instanceof ShadowRoot;
}

export function getShadowHost(el: Element): Element | null {
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

// =============================================================================
// Element Name
// =============================================================================

/** Returns a human-readable name for an element (e.g. 'button "Save"', 'heading "Welcome"') */
export function identifyElement(el: Element): { name: string; path: string } {
  const name = getElementName(el);
  const path = getElementPath(el);
  return { name, path };
}

function getElementName(el: Element): string {
  const tag = el.tagName.toLowerCase();

  // Buttons
  if (tag === "button" || el.getAttribute("role") === "button") {
    const text = getShortText(el);
    return text ? `button "${text}"` : `button`;
  }

  // Links
  if (tag === "a") {
    const text = getShortText(el);
    return text ? `link "${text}"` : `link`;
  }

  // Inputs
  if (tag === "input" || tag === "textarea" || tag === "select") {
    const label = getInputLabel(el);
    const type = el.getAttribute("type") || tag;
    return label ? `${type} input "${label}"` : `${type} input`;
  }

  // Headings
  if (/^h[1-6]$/.test(tag)) {
    const text = getShortText(el);
    return text ? `${tag} "${text}"` : tag;
  }

  // Images
  if (tag === "img") {
    const alt = el.getAttribute("alt");
    return alt ? `image "${alt}"` : "image";
  }

  // ARIA label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return `${tag} "${ariaLabel}"`;

  // ID
  const id = el.id;
  if (id) return `${tag}#${id}`;

  // Class-based
  const classes = Array.from(el.classList).slice(0, 2).join(".");
  if (classes) return `${tag}.${classes}`;

  // Text content
  const text = getShortText(el);
  if (text) return `${tag} "${text}"`;

  return tag;
}

function getShortText(el: Element, maxLen = 40): string {
  const text = el.textContent?.trim() ?? "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}

function getInputLabel(el: Element): string {
  // Check for associated label
  const id = el.id;
  if (id) {
    const label = el.ownerDocument.querySelector(`label[for="${id}"]`);
    if (label) return getShortText(label);
  }

  // Check parent label
  const parentLabel = el.closest("label");
  if (parentLabel) {
    const labelText = parentLabel.textContent?.trim() ?? "";
    // Remove the input's own value from label text
    const inputValue = (el as HTMLInputElement).value ?? "";
    return getShortText({
      textContent: labelText.replace(inputValue, "").trim(),
    } as Element);
  }

  // Placeholder
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return placeholder;

  // aria-label
  return el.getAttribute("aria-label") ?? "";
}

// =============================================================================
// Element Path
// =============================================================================

/** Builds a readable CSS-like path: "article > section > p" */
export function getElementPath(el: Element, maxDepth = 5): string {
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  const MAX_ITERATIONS = 50; // safety cap to prevent infinite loops
  let iterations = 0;

  while (current && depth < maxDepth && iterations < MAX_ITERATIONS) {
    iterations++;
    const tag = current.tagName.toLowerCase();

    // Skip generic wrappers
    if (
      ["div", "span"].includes(tag) &&
      !current.id &&
      current.classList.length === 0
    ) {
      current = getParentElement(current);
      continue;
    }

    let selector = tag;
    if (current.id) {
      selector = `${tag}#${current.id}`;
    } else if (current.classList.length > 0) {
      selector = `${tag}.${Array.from(current.classList).slice(0, 2).join(".")}`;
    }

    // Mark shadow boundary crossings
    if (
      isInShadowDOM(current) &&
      getParentElement(current) &&
      !isInShadowDOM(getParentElement(current)!)
    ) {
      selector = `\u27E8shadow\u27E9 ${selector}`;
    }

    parts.unshift(selector);
    current = getParentElement(current);
    depth++;
  }

  return parts.join(" > ");
}

// =============================================================================
// Contextual Information
// =============================================================================

/** Get nearby sibling elements for context */
export function getNearbyElements(el: Element, count = 3): string {
  const parent = getParentElement(el);
  if (!parent) return "";

  const siblings = Array.from(parent.children);
  const idx = siblings.indexOf(el);
  const nearby = siblings
    .slice(Math.max(0, idx - count), idx + count + 1)
    .filter((s) => s !== el)
    .map((s) => {
      const tag = s.tagName.toLowerCase();
      const text = getShortText(s, 20);
      return text ? `${tag}("${text}")` : tag;
    });

  return nearby.join(", ");
}

/** Get text content from element and nearby siblings */
export function getNearbyText(el: Element): string {
  const parts: string[] = [];

  // Previous sibling text
  const prev = el.previousElementSibling;
  if (prev) {
    const text = getShortText(prev, 50);
    if (text) parts.push(text);
  }

  // Element text
  const text = getShortText(el, 100);
  if (text) parts.push(`[${text}]`);

  // Next sibling text
  const next = el.nextElementSibling;
  if (next) {
    const text = getShortText(next, 50);
    if (text) parts.push(text);
  }

  return parts.join(" ");
}

/** Get CSS classes */
export function getCssClasses(el: Element): string {
  return Array.from(el.classList).join(" ");
}

/** Get bounding box as percentage/px values */
export function getBoundingBox(el: Element): BoundingBox {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

/** Get accessibility info */
export function getAccessibilityInfo(el: Element): string {
  const parts: string[] = [];

  const role = el.getAttribute("role");
  if (role) parts.push(`role="${role}"`);

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) parts.push(`aria-label="${ariaLabel}"`);

  const ariaDescribedBy = el.getAttribute("aria-describedby");
  if (ariaDescribedBy) parts.push(`aria-describedby="${ariaDescribedBy}"`);

  const tabIndex = el.getAttribute("tabindex");
  if (tabIndex) parts.push(`tabindex=${tabIndex}`);

  // Check focusability
  const focusable =
    el instanceof HTMLElement &&
    (el.tabIndex >= 0 ||
      ["a", "button", "input", "select", "textarea"].includes(
        el.tagName.toLowerCase(),
      ));
  if (focusable) parts.push("focusable");

  return parts.join(", ");
}

/** Get computed styles relevant to the element type */
export function getComputedStyles(el: Element): string {
  const styles = window.getComputedStyle(el);
  const tag = el.tagName.toLowerCase();
  const parts: string[] = [];

  // Typography (for text elements)
  if (
    [
      "p",
      "span",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "a",
      "button",
      "label",
    ].includes(tag)
  ) {
    parts.push(
      `font: ${styles.fontSize} ${styles.fontWeight} ${styles.fontFamily.split(",")[0]}`,
    );
    parts.push(`color: ${styles.color}`);
    if (styles.lineHeight !== "normal")
      parts.push(`line-height: ${styles.lineHeight}`);
  }

  // Layout
  if (styles.display !== "inline") parts.push(`display: ${styles.display}`);
  if (styles.position !== "static") parts.push(`position: ${styles.position}`);

  // Dimensions
  parts.push(
    `${Math.round(parseFloat(styles.width))}x${Math.round(parseFloat(styles.height))}`,
  );

  // Background
  if (styles.backgroundColor !== "rgba(0, 0, 0, 0)") {
    parts.push(`bg: ${styles.backgroundColor}`);
  }

  return parts.join("; ");
}

/** Full DOM path for forensic mode */
export function getFullElementPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current) {
    const tag = current.tagName.toLowerCase();
    let selector = tag;

    if (current.id) {
      selector += `#${current.id}`;
    } else {
      const parent = getParentElement(current);
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current!.tagName,
        );
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${idx})`;
        }
      }
    }

    parts.unshift(selector);
    current = getParentElement(current);
  }

  return parts.join(" > ");
}
