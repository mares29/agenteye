// =============================================================================
// Background Service Worker
// =============================================================================
// Handles extension lifecycle, context menu, badge, and programmatic injection.
// Content scripts are injected on demand (not declared in manifest) to avoid
// broad host permissions that trigger Chrome Web Store in-depth review.

// =============================================================================
// Programmatic Injection
// =============================================================================

async function ensureInjected(tabId: number): Promise<boolean> {
  // Check if content script is already running in this tab
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "ping" });
    if (response?.pong) return true;
  } catch {
    // Not injected yet
  }

  // Inject bridge first (MAIN world — accesses page JS like __svelte_meta)
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/bridge.js"],
    world: "MAIN" as any,
  });

  // Then inject content script (ISOLATED world — default)
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/index.js"],
  });

  return false;
}

// =============================================================================
// Context Menu
// =============================================================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle-agenteye",
    title: "Toggle AgentEye",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "toggle-agenteye" && tab?.id) {
    const wasInjected = await ensureInjected(tab.id);
    if (wasInjected) {
      chrome.tabs.sendMessage(tab.id, { type: "toggle-agenteye" });
    }
    // If freshly injected, content script starts with annotation mode ready
  }
});

// =============================================================================
// Message Handling
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Screenshot capture (from content script)
  if (message.type === "capture-screenshot") {
    chrome.tabs
      .captureVisibleTab(
        sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
        { format: "png" },
      )
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Popup: get current state
  if (message.type === "popup-get-state") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ enabled: false });
        return;
      }
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: "get-extension-state",
        });
        sendResponse(response);
      } catch {
        sendResponse({ enabled: false });
      }
    });
    return true;
  }

  // Popup: toggle extension
  if (message.type === "popup-toggle") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ enabled: false });
        return;
      }
      try {
        const wasInjected = await ensureInjected(tabId);
        if (wasInjected) {
          // Already running — toggle visibility
          const response = await chrome.tabs.sendMessage(tabId, {
            type: "toggle-extension",
          });
          sendResponse(response);
        } else {
          // Freshly injected — starts visible
          sendResponse({ enabled: true });
        }
      } catch (err) {
        sendResponse({ enabled: false });
      }
    });
    return true;
  }
});
