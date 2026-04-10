// =============================================================================
// Popup Script — enable/disable extension per site
// =============================================================================
// Routes through background service worker which handles programmatic injection.

const toggle = document.querySelector("#toggle input") as HTMLInputElement;

// Get current state from background (which checks if content script is injected)
chrome.runtime.sendMessage({ type: "popup-get-state" }, (response) => {
  if (chrome.runtime.lastError) return;
  if (response) toggle.checked = response.enabled;
});

toggle.addEventListener("change", () => {
  chrome.runtime.sendMessage({ type: "popup-toggle" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response) toggle.checked = response.enabled;
  });
});
