// =============================================================================
// Framework Detection Registry
// =============================================================================
//
// Bridges between the content script (isolated world) and the MAIN world
// bridge script that can access __svelte_meta / __reactFiber$ on DOM elements.
//
// Communication via CustomEvents on document.

import type { FrameworkComponentInfo } from "../types";

let detectedFrameworks: string[] = [];
let detected = false;

/** Request framework detection from the MAIN world bridge */
export function detectFrameworks(): string[] {
  document.dispatchEvent(new CustomEvent("agenteye:detect-request"));
  // Response comes synchronously via event
  return detectedFrameworks;
}

// Listen for detection response from bridge
document.addEventListener("agenteye:detect-response", ((e: CustomEvent) => {
  detectedFrameworks = e.detail?.frameworks ?? [];
  detected = true;
}) as EventListener);

/** Get component info for an element by asking the MAIN world bridge.
 *  Uses synchronous event dispatch — bridge responds immediately. */
export function getComponentInfo(el: Element): FrameworkComponentInfo | null {
  if (!detected) {
    detectFrameworks();
  }

  // Get element position to identify it in MAIN world
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  let result: FrameworkComponentInfo | null = null;

  const handler = ((e: CustomEvent) => {
    result = e.detail;
  }) as EventListener;

  document.addEventListener("agenteye:element-info-response", handler, {
    once: true,
  });
  document.dispatchEvent(
    new CustomEvent("agenteye:element-info", { detail: { x, y } }),
  );
  document.removeEventListener("agenteye:element-info-response", handler);

  return result;
}

/** Get list of detected framework names */
export function getActiveFrameworks(): string[] {
  return detectedFrameworks;
}
