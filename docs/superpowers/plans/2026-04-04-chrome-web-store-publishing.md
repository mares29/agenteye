# Chrome Web Store Publishing Plan — AgentEye

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish AgentEye v0.1.0 to the Chrome Web Store so users can install it directly from the store.

**Architecture:** Prepare all required store assets (icons, screenshots, privacy policy, store listing copy), update the manifest with icon references, create a production build zip, register a Chrome Web Store developer account, and submit for review.

**Tech Stack:** Chrome Web Store Developer Dashboard, esbuild (existing build), PNG icons

---

## Current State

| Requirement                          | Status                      |
| ------------------------------------ | --------------------------- |
| Manifest V3                          | ✅ Already using MV3        |
| `manifest.json` icons field          | ❌ Missing — no `icons` key |
| Icon PNG files (16, 32, 48, 128)     | ❌ None exist               |
| Store icon (128×128)                 | ❌ None                     |
| Screenshots (1280×800 or 640×400)    | ❌ None                     |
| Privacy policy URL                   | ❌ No policy written        |
| Store description (short + detailed) | ❌ Not written              |
| Production build zip                 | ❌ No zip script            |
| Developer account ($5 fee)           | ❓ Unknown                  |

---

## Task 1: Create Extension Icons

**Files:**

- Create: `icons/icon-16.png`
- Create: `icons/icon-32.png`
- Create: `icons/icon-48.png`
- Create: `icons/icon-128.png`

AgentEye's brand is **sulphur yellow (#e6d520) on glassy black**. The icon should be a stylized eye or crosshair motif.

- [ ] **Step 1: Design or generate a 128×128 base icon**

Create a square PNG icon at 128×128. Options:

1. **Design tool** — Figma, Sketch, or Photoshop
2. **SVG → PNG pipeline** — create an SVG, convert with a tool like `cairosvg` or browser export
3. **AI image generation** — use an image generator, then clean up

The icon should:

- Work at small sizes (16px) — simple shapes, no fine detail
- Use sulphur yellow `#e6d520` as primary color on dark/transparent background
- Represent "visual feedback" or "eye" concept
- Have transparent background (PNG with alpha)

- [ ] **Step 2: Generate all required sizes**

From the 128×128 base, resize to 48×48, 32×32, and 16×16. Use any tool:

```bash
# Using sips (macOS built-in):
mkdir -p icons
cp base-icon-128.png icons/icon-128.png
sips -z 48 48 icons/icon-128.png --out icons/icon-48.png
sips -z 32 32 icons/icon-128.png --out icons/icon-32.png
sips -z 16 16 icons/icon-128.png --out icons/icon-16.png
```

Or with ImageMagick:

```bash
convert icons/icon-128.png -resize 48x48 icons/icon-48.png
convert icons/icon-128.png -resize 32x32 icons/icon-32.png
convert icons/icon-128.png -resize 16x16 icons/icon-16.png
```

- [ ] **Step 3: Verify icons visually**

Open each PNG and confirm:

- 128×128 — clear, recognizable brand
- 48×48 — still readable (used in extensions page `chrome://extensions`)
- 16×16 — simplified but identifiable (toolbar icon)

---

## Task 2: Update Manifest with Icons

**Files:**

- Modify: `manifest.json`

- [ ] **Step 1: Add `icons` field to manifest.json**

Add the `icons` object after the `version` field:

```json
{
  "manifest_version": 3,
  "name": "AgentEye",
  "description": "Visual feedback for AI coding agents — click elements, annotate, and send structured feedback.",
  "version": "0.1.0",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": ["activeTab", "storage", "contextMenus"],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/index.js"
  },
  "content_scripts": [
    {
      "matches": ["http://*/*", "https://*/*"],
      "js": ["content/bridge.js"],
      "run_at": "document_idle",
      "world": "MAIN"
    },
    {
      "matches": ["http://*/*", "https://*/*"],
      "js": ["content/index.js"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 2: Update build script to copy icons**

In `scripts/build.ts`, the line `mkdirSync("dist/icons", { recursive: true })` already exists but no icons are copied. Add a copy after it:

```typescript
// After: mkdirSync("dist/icons", { recursive: true });
// Add:
cpSync("icons", "dist/icons", { recursive: true });
```

The full relevant section in `scripts/build.ts` (lines 62-67) should become:

```typescript
// Copy static files
mkdirSync("dist", { recursive: true });
mkdirSync("dist/icons", { recursive: true });
cpSync("manifest.json", "dist/manifest.json");
cpSync("src/popup/index.html", "dist/popup/index.html");
cpSync("icons", "dist/icons", { recursive: true });
```

- [ ] **Step 3: Build and verify icons load**

```bash
bun run build
```

Then load the unpacked extension from `dist/` in `chrome://extensions` and verify the icon appears in the toolbar and extensions page.

- [ ] **Step 4: Commit**

```bash
git add icons/ manifest.json scripts/build.ts
git commit -m "Add extension icons for Chrome Web Store"
```

---

## Task 3: Write Privacy Policy

**Files:**

- Create: `PRIVACY.md`

Chrome Web Store **requires a privacy policy URL** for extensions that use `storage`, `activeTab`, or request host permissions. AgentEye accesses page DOM and stores settings.

- [ ] **Step 1: Create PRIVACY.md**

```markdown
# AgentEye Privacy Policy

**Last updated:** 2026-04-04

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
```

- [ ] **Step 2: Commit**

```bash
git add PRIVACY.md
git commit -m "Add privacy policy for Chrome Web Store"
```

- [ ] **Step 3: Host the privacy policy**

The Chrome Web Store requires a **URL** to the privacy policy, not a file. Options:

1. **GitHub** (easiest) — if the repo is public, use the raw GitHub URL: `https://github.com/<owner>/agenteye/blob/main/PRIVACY.md`
2. **GitHub Pages** — host as a rendered page
3. **Standalone page** — host at a custom domain

Pick one and note the URL — you'll need it during store submission (Task 6).

---

## Task 4: Prepare Store Listing Copy

**Files:**

- Create: `docs/store-listing.md`

Chrome Web Store requires specific text fields. Prepare them in advance.

- [ ] **Step 1: Write store listing content**

Create `docs/store-listing.md`:

```markdown
# AgentEye — Chrome Web Store Listing

## Name (max 75 chars)

AgentEye — Visual Feedback for AI Coding Agents

## Short Description (max 132 chars)

Click elements, annotate, and send structured visual feedback to AI coding agents. Works with any AI assistant.

## Detailed Description (max 16,000 chars)

AgentEye is a developer tool that bridges the gap between what you see in your browser and what your AI coding agent understands.

**The Problem**
AI coding agents can't see your screen. When something looks wrong — a misaligned button, a broken layout, a wrong color — you have to describe it in words. That's slow and imprecise.

**The Solution**
AgentEye lets you click directly on page elements and annotate them with feedback. It generates structured, machine-readable descriptions that your AI agent can act on immediately.

**How It Works**

1. Enable AgentEye on any page via the toolbar icon
2. Click elements to select them — each gets a numbered pin
3. Add text annotations describing what's wrong or what you want changed
4. Copy the structured output — paste it into your AI chat

**Features**
• Element detection with numbered annotation pins
• Framework-aware: detects React, Svelte components and their props
• 4 detail levels: minimal → verbose output
• Structured Markdown output ready for AI consumption
• Hover overlay to preview elements before selecting
• Works on any website
• All data stays local — no tracking, no analytics

**Who It's For**
• Developers using AI coding assistants (Claude, ChatGPT, Copilot, Cursor)
• QA engineers documenting visual bugs
• Designers communicating feedback to developers

**Privacy**
AgentEye stores settings locally and sends no data to external servers. See our privacy policy for details.

## Category

Developer Tools

## Language

English
```

- [ ] **Step 2: Commit**

```bash
git add docs/store-listing.md
git commit -m "Add Chrome Web Store listing copy"
```

---

## Task 5: Capture Screenshots

The Chrome Web Store requires **at least 1 screenshot** (1280×800 or 640×400 PNG/JPEG). Up to 5 are recommended. Optionally, a 1400×560 promotional tile.

**Files:**

- Create: `docs/store-assets/screenshot-1.png`
- Create: `docs/store-assets/screenshot-2.png`
- Create: `docs/store-assets/screenshot-3.png` (optional)

- [ ] **Step 1: Prepare demo scenarios**

Set up pages that showcase AgentEye's features:

1. **Screenshot 1 — Annotation in action:** A web page with 2-3 elements selected, showing numbered pins and the annotation popup. This is the hero image.
2. **Screenshot 2 — Hover overlay:** Show the yellow highlight on hover, demonstrating element detection.
3. **Screenshot 3 — Structured output:** Show the copied markdown output, or the settings panel with detail levels.

- [ ] **Step 2: Capture screenshots at correct dimensions**

```bash
mkdir -p docs/store-assets
```

Use Chrome DevTools to set viewport to exactly **1280×800**:

1. Open DevTools → Device Toolbar (Ctrl+Shift+M)
2. Set dimensions to 1280×800
3. Navigate to your demo page
4. Enable AgentEye and set up the scene
5. Take a full-page screenshot (Ctrl+Shift+P → "Capture screenshot")

Repeat for each scenario.

- [ ] **Step 3: Review and optimize**

- Ensure screenshots are clean — no personal data, no distracting tabs
- File size should be under 1MB each (Chrome Web Store limit)
- Verify dimensions are exactly 1280×800 or 640×400

---

## Task 6: Create Production Build Zip

**Files:**

- Modify: `package.json` (add zip script)

- [ ] **Step 1: Add a zip build script**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "bun run build --watch",
    "build": "bun run scripts/build.ts",
    "build:zip": "bun run build && cd dist && zip -r ../agenteye-v0.1.0.zip . -x '*.map'",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Build the zip**

```bash
bun run build:zip
```

Verify the zip:

```bash
unzip -l agenteye-v0.1.0.zip
```

Confirm it contains:

- `manifest.json`
- `icons/icon-*.png` (all 4 sizes)
- `background/index.js`
- `content/index.js`
- `content/bridge.js`
- `popup/index.html`
- `popup/popup.js`

No `.map` files, no `node_modules`, no `src/`.

- [ ] **Step 3: Test the zip**

1. Unzip to a temporary directory
2. Go to `chrome://extensions` → Enable Developer Mode
3. Click "Load unpacked" → select the unzipped directory
4. Verify the extension works: icon shows, popup works, content script activates

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Add build:zip script for Chrome Web Store"
```

---

## Task 7: Register Chrome Web Store Developer Account

> **This task is manual — no code changes.**

- [ ] **Step 1: Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)**

Sign in with the Google account you want to own the extension.

- [ ] **Step 2: Pay the one-time $5 registration fee**

This is required before you can publish anything. It's non-refundable.

- [ ] **Step 3: Verify your email (if prompted)**

Google may require email verification for new developer accounts.

- [ ] **Step 4: Set up developer profile**

Fill in:

- **Developer name** — your name or company name (shown publicly on the store)
- **Contact email** — for store communication
- **Physical address** — required by Google (may not be displayed publicly depending on region)

---

## Task 8: Submit Extension to Chrome Web Store

> **This task is manual — uses the Developer Dashboard UI.**

- [ ] **Step 1: Create a new item**

In the Developer Dashboard, click **"New Item"** and upload `agenteye-v0.1.0.zip`.

- [ ] **Step 2: Fill in Store Listing tab**

Using content from `docs/store-listing.md`:

| Field       | Value                                           |
| ----------- | ----------------------------------------------- |
| Name        | AgentEye — Visual Feedback for AI Coding Agents |
| Summary     | (short description from store-listing.md)       |
| Description | (detailed description from store-listing.md)    |
| Category    | Developer Tools                                 |
| Language    | English                                         |
| Icon        | Upload `icons/icon-128.png`                     |
| Screenshots | Upload from `docs/store-assets/`                |

- [ ] **Step 3: Fill in Privacy Practices tab**

| Field                          | Value                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single purpose description     | "Enables users to visually select and annotate web page elements, generating structured feedback descriptions for AI coding assistants."                                                |
| Host permissions justification | "Content scripts need to run on any site so users can annotate elements on whatever page they're working on. The extension only activates when the user explicitly enables it."         |
| `activeTab` justification      | "Required to inject the content script that creates visual annotations on the active tab."                                                                                              |
| `storage` justification        | "Stores user preferences (detail level, per-site toggle) locally."                                                                                                                      |
| `contextMenus` justification   | "Adds a right-click option for quick element selection."                                                                                                                                |
| Are you using remote code?     | No                                                                                                                                                                                      |
| Privacy policy URL             | (URL from Task 3, Step 3)                                                                                                                                                               |
| Data usage disclosures         | Does NOT collect: personally identifiable information, health info, financial info, authentication info, personal communications, location, web history, user activity, website content |

- [ ] **Step 4: Fill in Distribution tab**

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| Visibility   | Public                                |
| Distribution | All regions (or select specific ones) |

- [ ] **Step 5: Submit for Review**

Click **"Submit for Review"**.

Review timelines:

- **New extensions:** typically 1-3 business days, can take up to a week
- **Updates:** usually faster, often under 24 hours
- You'll get an email when the review is complete

If rejected, the dashboard will show the reason. Common rejection reasons:

- Missing or inadequate privacy policy
- Description doesn't match functionality
- Requesting more permissions than needed
- Icon/screenshot quality issues

---

## Task 9: Post-Publication Setup

- [ ] **Step 1: Verify the listing is live**

After approval, visit the Chrome Web Store and search for "AgentEye". Verify:

- Icon displays correctly
- Description renders properly
- Screenshots are visible
- "Add to Chrome" button works

- [ ] **Step 2: Test installation from the store**

Install from the store on a clean Chrome profile:

1. Click "Add to Chrome"
2. Confirm the permissions dialog
3. Enable AgentEye on a test page
4. Verify full functionality

- [ ] **Step 3: Add store badge to README (optional)**

If you have a `README.md`, you can add:

```markdown
[![Available on Chrome Web Store](https://img.shields.io/chrome-web-store/v/YOUR_EXTENSION_ID)](https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID)
```

- [ ] **Step 4: Plan for updates**

For future versions:

1. Bump `version` in `manifest.json` and `package.json`
2. Update the version in the `build:zip` script
3. Run `bun run build:zip`
4. Upload new zip in Developer Dashboard → your extension → "Package" tab
5. Submit for review (updates are usually faster)

---

## Checklist Summary

| #   | Task                           | Type            | Time Estimate |
| --- | ------------------------------ | --------------- | ------------- |
| 1   | Create extension icons         | Creative/Design | —             |
| 2   | Update manifest + build script | Code            | —             |
| 3   | Write privacy policy           | Writing         | —             |
| 4   | Write store listing copy       | Writing         | —             |
| 5   | Capture screenshots            | Manual          | —             |
| 6   | Create production zip          | Code            | —             |
| 7   | Register developer account     | Manual ($5)     | —             |
| 8   | Submit to Chrome Web Store     | Manual          | —             |
| 9   | Post-publication verification  | Manual          | —             |

**Dependencies:** Task 1 → Task 2 → Task 6. Task 3 must be done before Task 8. Tasks 3, 4, 5, 7 can be done in parallel.
