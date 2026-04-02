// =============================================================================
// Content Script Entry Point
// =============================================================================
// Bootstraps the AgentEye engine and UI inside the page.
// Starts hidden — enabled per-site via the extension popup toggle.

import { createAgentEye } from "./engine";
import { attachInteraction } from "./dom/interaction";
import { freezeAnimations } from "./dom/freeze";
import { detectFrameworks, getComponentInfo } from "./detection/registry";
// Note: actual framework detection runs in MAIN world via bridge.ts
// registry.ts communicates with it via CustomEvents
import { Toolbar } from "./ui/toolbar";
import { HoverOverlay } from "./ui/hover-overlay";
import { AnnotationMarkers } from "./ui/markers";
import { AnnotationPopup } from "./ui/popup";
import styles from "./ui/styles.css?raw";

// =============================================================================
// Shadow DOM Container
// =============================================================================

const host = document.createElement("div");
host.id = "agenteye-root";
host.style.cssText =
  "all: initial; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none; display: none;";
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: "open" });

const styleEl = document.createElement("style");
styleEl.textContent = styles;
shadow.appendChild(styleEl);

// =============================================================================
// Engine
// =============================================================================

const engine = createAgentEye();

// =============================================================================
// UI Components
// =============================================================================

const toolbar = new Toolbar(shadow, engine);
const hoverOverlay = new HoverOverlay(shadow);
const markers = new AnnotationMarkers(shadow);
const popup = new AnnotationPopup(shadow, engine);

// =============================================================================
// State → UI Binding
// =============================================================================

let unfreezeRef: (() => void) | null = null;

engine.on("state:change", (state) => {
  toolbar.update(state);
  hoverOverlay.update(state.hoverInfo);
  markers.update(state.annotations);
});

engine.on("pending:change", (pending) => {
  if (pending) {
    popup.show(pending);
  }
});

engine.on("freeze:change", (frozen) => {
  if (frozen) {
    unfreezeRef = freezeAnimations();
  } else if (unfreezeRef) {
    unfreezeRef();
    unfreezeRef = null;
  }
});

// =============================================================================
// DOM Interaction
// =============================================================================

const detachInteraction = attachInteraction(engine, {
  isExtensionElement: (el: Element) => {
    return host.contains(el) || el === host;
  },
  detectFramework: getComponentInfo,
});

// =============================================================================
// Show / Hide (controlled by popup toggle)
// =============================================================================

let extensionEnabled = false;

function showExtension(): void {
  if (extensionEnabled) return;
  extensionEnabled = true;
  host.style.display = "";

  // Detect frameworks on first enable
  const detected = detectFrameworks();
  if (detected.length > 0) {
    console.log(`[AgentEye] Detected frameworks: ${detected.join(", ")}`);
  }
}

function hideExtension(): void {
  if (!extensionEnabled) return;
  extensionEnabled = false;
  host.style.display = "none";

  // Deactivate annotation mode if active
  if (engine.getState().active) {
    engine.deactivate();
  }
  // Unfreeze if frozen
  if (engine.getState().frozen) {
    engine.setFrozen(false);
  }
}

// Check if this origin was previously enabled
const origin = window.location.origin;
const ENABLED_SITES_KEY = "agenteye:enabledSites";

chrome.storage?.local?.get(ENABLED_SITES_KEY, (result) => {
  const sites: string[] = result[ENABLED_SITES_KEY] ?? [];
  if (sites.includes(origin)) {
    showExtension();
  }
});

function persistEnabledState(): void {
  chrome.storage?.local?.get(ENABLED_SITES_KEY, (result) => {
    const sites: string[] = result[ENABLED_SITES_KEY] ?? [];
    if (extensionEnabled && !sites.includes(origin)) {
      chrome.storage.local.set({ [ENABLED_SITES_KEY]: [...sites, origin] });
    } else if (!extensionEnabled && sites.includes(origin)) {
      chrome.storage.local.set({
        [ENABLED_SITES_KEY]: sites.filter((s) => s !== origin),
      });
    }
  });
}

// =============================================================================
// Extension Message Handler
// =============================================================================

chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (message.type === "toggle-extension") {
    if (extensionEnabled) {
      hideExtension();
    } else {
      showExtension();
    }
    persistEnabledState();
    sendResponse({ enabled: extensionEnabled });
  }

  if (message.type === "get-extension-state") {
    sendResponse({ enabled: extensionEnabled });
  }

  if (message.type === "toggle-agenteye") {
    const state = engine.getState();
    if (state.active) {
      engine.deactivate();
    } else {
      engine.activate();
    }
    sendResponse({ active: engine.getState().active });
  }

  if (message.type === "get-state") {
    sendResponse({ ...engine.getState(), enabled: extensionEnabled });
  }
});

// =============================================================================
// Cleanup
// =============================================================================

(window as any).__agenteye_cleanup?.();
(window as any).__agenteye_cleanup = () => {
  detachInteraction();
  toolbar.destroy();
  hoverOverlay.destroy();
  markers.destroy();
  popup.destroy();
  engine.destroy();
  host.remove();
  if (unfreezeRef) unfreezeRef();
};
