// =============================================================================
// DOM Interaction Handler
// =============================================================================
//
// Wires up document-level event listeners for:
// - Hover highlighting (mousemove)
// - Click to annotate (click)
// - Drag to multi-select (mousedown/mousemove/mouseup)
// - Keyboard shortcuts (keydown)
//
// Returns a teardown function that removes all listeners.

import type { AgentEyeEngine } from "../engine";
import {
  identifyElement,
  getBoundingBox,
  getNearbyText,
  getNearbyElements,
  getCssClasses,
  getComputedStyles,
  getAccessibilityInfo,
  getFullElementPath,
} from "./element-id";
import type { FrameworkComponentInfo, PendingAnnotation } from "../types";

type FrameworkDetectorFn = (el: Element) => FrameworkComponentInfo | null;

export type InteractionConfig = {
  /** Elements belonging to the extension UI (skip when hovering/clicking) */
  isExtensionElement: (el: Element) => boolean;
  /** Framework detection function (queries all registered detectors) */
  detectFramework?: FrameworkDetectorFn;
};

export function attachInteraction(
  engine: AgentEyeEngine,
  config: InteractionConfig,
): () => void {
  const { isExtensionElement, detectFramework } = config;
  let isDragging = false;
  let dragStart: { x: number; y: number } | null = null;

  function getTargetElement(e: MouseEvent): Element | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isExtensionElement(el)) return null;
    return el;
  }

  // ─── Hover ───────────────────────────────────────────────────
  function onMouseMove(e: MouseEvent): void {
    if (!engine.getState().active || isDragging) return;

    const el = getTargetElement(e);
    if (!el) {
      engine.setHoverInfo(null);
      return;
    }

    const { name, path } = identifyElement(el);
    const boundingBox = getBoundingBox(el);
    const frameworkInfo = detectFramework?.(el) ?? undefined;

    engine.setHoverInfo({
      element: el,
      name,
      path,
      boundingBox,
      frameworkInfo,
    });
  }

  // ─── Click ───────────────────────────────────────────────────
  function onClick(e: MouseEvent): void {
    if (!engine.getState().active) return;

    const el = getTargetElement(e);
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const { name, path } = identifyElement(el);
    const boundingBox = getBoundingBox(el);
    const frameworkInfo = detectFramework?.(el) ?? undefined;

    // Get selected text if any
    const selection = window.getSelection();
    const selectedText =
      selection && selection.toString().trim()
        ? selection.toString().trim()
        : undefined;

    const pending: PendingAnnotation = {
      x: (e.clientX / window.innerWidth) * 100,
      y: e.clientY + window.scrollY,
      element: name,
      elementPath: path,
      boundingBox,
      selectedText,
      nearbyText: getNearbyText(el),
      nearbyElements: getNearbyElements(el),
      cssClasses: getCssClasses(el),
      computedStyles: getComputedStyles(el),
      fullPath: getFullElementPath(el),
      accessibility: getAccessibilityInfo(el),
      frameworkInfo,
      sourceFile: frameworkInfo?.sourceFile,
      isFixed: isFixedPosition(el),
    };

    engine.setPendingAnnotation(pending);
  }

  // ─── Drag Select ─────────────────────────────────────────────
  function onMouseDown(e: MouseEvent): void {
    if (!engine.getState().active || e.button !== 0) return;
    if (isExtensionElement(e.target as Element)) return;

    dragStart = { x: e.clientX, y: e.clientY };
  }

  function onMouseUp(e: MouseEvent): void {
    if (!dragStart) return;

    const dx = Math.abs(e.clientX - dragStart.x);
    const dy = Math.abs(e.clientY - dragStart.y);

    // If drag distance is small, treat as click (handled by onClick)
    if (dx < 5 && dy < 5) {
      dragStart = null;
      isDragging = false;
      return;
    }

    isDragging = false;
    dragStart = null;

    // Multi-select: get all elements within the drag rectangle
    // (future enhancement — for now, single click is the primary interaction)
  }

  // ─── Keyboard ────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent): void {
    // Escape: cancel pending annotation or deactivate
    if (e.key === "Escape") {
      const state = engine.getState();
      if (state.pendingAnnotation) {
        engine.setPendingAnnotation(null);
      } else if (state.active) {
        engine.deactivate();
      }
      return;
    }

    // Delete/Backspace: delete selected annotation (future)
  }

  // ─── Attach ──────────────────────────────────────────────────
  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("click", onClick, true); // capture phase
  document.addEventListener("mousedown", onMouseDown, { passive: true });
  document.addEventListener("mouseup", onMouseUp, { passive: true });
  document.addEventListener("keydown", onKeyDown);

  // ─── Teardown ────────────────────────────────────────────────
  return () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("keydown", onKeyDown);
  };
}

// =============================================================================
// Helpers
// =============================================================================

function isFixedPosition(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    const position = window.getComputedStyle(current).position;
    if (position === "fixed" || position === "sticky") return true;
    current = current.parentElement;
  }
  return false;
}
