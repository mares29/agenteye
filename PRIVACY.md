# AgentEye Privacy Policy

**Last updated:** 2026-04-05

## What AgentEye Does

AgentEye is a Chrome extension that helps AI coding agents receive visual feedback on web pages. It allows users to click elements, add annotations, and generate structured descriptions of UI components.

## Data Collection

AgentEye does **not** collect, transmit, or store any personal data. Specifically:

- **No analytics or tracking** — AgentEye includes no telemetry, analytics, or tracking code.
- **No remote servers** — All data stays in your browser. AgentEye does not send data to any external server unless you explicitly configure an MCP server sync URL.
- **No user accounts** — AgentEye does not require registration or login.

## Data Stored Locally

AgentEye stores the following data **locally in your browser** using `chrome.storage.local`:

- **Extension settings** — your preferred detail level, clear-after-copy preference, and per-site enable/disable state.
- **Annotations** — element annotations you create during a session. These are temporary and cleared when you copy or manually clear them.

This data never leaves your browser unless you explicitly copy it to your clipboard.

## Permissions Explained

| Permission     | Why It's Needed                                                                         |
| -------------- | --------------------------------------------------------------------------------------- |
| `activeTab`    | To inject the content script that highlights and annotates elements on the current page |
| `storage`      | To persist your settings (detail level, per-site toggle) across browser sessions        |
| `contextMenus` | To add a right-click menu option for quick actions                                      |

## Host Permissions

AgentEye's content scripts run on `http://*/*` and `https://*/*` so it can work on any website you choose to activate it on. It only activates when you explicitly enable it via the extension popup.

## Optional MCP Server Sync

If you configure a sync server URL in settings, AgentEye will send annotation data to that URL. This is entirely opt-in and disabled by default. You control the server endpoint.

## Third-Party Services

AgentEye does not integrate with any third-party services, advertising networks, or data brokers.

## Changes to This Policy

If this policy changes, the update will be reflected in this document with a new "Last updated" date.

## Contact

For questions about this privacy policy, open an issue at the project's GitHub repository.
