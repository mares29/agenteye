// =============================================================================
// Popup Script — enable/disable extension per site
// =============================================================================

const toggle = document.querySelector("#toggle input") as HTMLInputElement;

async function refreshState(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(
      tab.id,
      { type: "get-extension-state" },
      (response) => {
        if (chrome.runtime.lastError || !response) return;
        toggle.checked = response.enabled;
      },
    );
  } catch {
    // Content script not loaded on this page
  }
}

toggle.addEventListener("change", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "toggle-extension" }, (response) => {
    if (response) {
      toggle.checked = response.enabled;
    }
  });
});

refreshState();
