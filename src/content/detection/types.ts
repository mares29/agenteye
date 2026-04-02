// =============================================================================
// Framework Detection Interface
// =============================================================================

import type { FrameworkComponentInfo } from "../types";

/** Each framework detector implements this interface */
export interface FrameworkDetector {
  /** Unique name (e.g. 'react', 'svelte') */
  readonly name: string;

  /** Check if this framework is present on the page */
  detect(): boolean;

  /** Get component info for a DOM element (returns null if element has no component) */
  getComponentInfo(el: Element): FrameworkComponentInfo | null;
}
