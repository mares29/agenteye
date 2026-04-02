// =============================================================================
// Background Service Worker
// =============================================================================
// Handles extension lifecycle, context menu, badge, and screenshot capture.

// Context menu: right-click to toggle annotation mode
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle-agenteye",
    title: "Toggle AgentEye",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "toggle-agenteye" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "toggle-agenteye" });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "capture-screenshot") {
    chrome.tabs
      .captureVisibleTab(
        sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
        {
          format: "png",
        },
      )
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // async response
  }
});
