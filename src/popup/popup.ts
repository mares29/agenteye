// =============================================================================
// Popup Script — enable/disable extension per site
// =============================================================================

const toggle = document.querySelector("#toggle input") as HTMLInputElement;

function sendToTab(
  message: Record<string, string>,
  callback?: (response: any) => void,
): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, message, (response) => {
      // Ignore "Receiving end does not exist" when content script isn't loaded
      if (chrome.runtime.lastError) return;
      callback?.(response);
    });
  });
}

sendToTab({ type: "get-extension-state" }, (response) => {
  if (response) toggle.checked = response.enabled;
});

toggle.addEventListener("change", () => {
  sendToTab({ type: "toggle-extension" }, (response) => {
    if (response) toggle.checked = response.enabled;
  });
});
