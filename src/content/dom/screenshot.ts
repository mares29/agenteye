// =============================================================================
// Screenshot Utilities
// =============================================================================
//
// Captures screenshots of the current viewport or specific elements.
// Uses the Chrome extension API (captureVisibleTab) when available.

/** Capture the visible tab as a data URL (requires activeTab permission) */
export async function captureVisibleTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new Error("Chrome extension API not available"));
      return;
    }

    // Request screenshot from background service worker
    chrome.runtime.sendMessage({ type: "capture-screenshot" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.dataUrl) {
        resolve(response.dataUrl);
      } else {
        reject(new Error("Failed to capture screenshot"));
      }
    });
  });
}

/** Get viewport dimensions */
export function getViewportInfo(): {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
} {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    devicePixelRatio: window.devicePixelRatio,
  };
}
