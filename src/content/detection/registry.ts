// =============================================================================
// Framework Detection Registry
// =============================================================================
//
// Auto-detects which frameworks are present on the page and provides
// a unified interface for querying component info from any detected framework.

import type { FrameworkDetector } from "./types";
import type { FrameworkComponentInfo } from "../types";
import { reactDetector } from "./react";
import { svelteDetector } from "./svelte";

// All registered detectors
const allDetectors: FrameworkDetector[] = [reactDetector, svelteDetector];

// Active detectors (detected on current page)
let activeDetectors: FrameworkDetector[] = [];

/** Run detection for all registered frameworks. Returns names of detected frameworks. */
export function detectFrameworks(): string[] {
  activeDetectors = allDetectors.filter((d) => d.detect());
  return activeDetectors.map((d) => d.name);
}

/** Get component info for an element from all active detectors */
export function getComponentInfo(el: Element): FrameworkComponentInfo | null {
  for (const detector of activeDetectors) {
    const info = detector.getComponentInfo(el);
    if (info) return info;
  }
  return null;
}

/** Register a custom framework detector */
export function registerDetector(detector: FrameworkDetector): void {
  allDetectors.push(detector);
}

/** Get list of currently active (detected) framework names */
export function getActiveFrameworks(): string[] {
  return activeDetectors.map((d) => d.name);
}
