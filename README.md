# AgentEye

Visual feedback tool for AI coding agents -- click, annotate, copy.

## Features

- Click elements to annotate with notes
- Framework detection (React fiber traversal, Svelte 5 component detection)
- 4 output detail levels: compact, standard, detailed, forensic
- Freeze page animations for clean captures
- Settings persist per-site via `chrome.storage.local`
- Shadow DOM isolation (no CSS conflicts with host page)
- Copy structured markdown to clipboard

## Installation

```sh
bun install
bun run build
```

Load the `dist/` folder as an unpacked extension in Chrome:

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` directory

## Development

```sh
bun run dev       # build with watch mode
bun run build     # production build
bun run test      # run tests (vitest)
```

## Tech Stack

TypeScript, esbuild, vitest, Chrome Manifest V3, vanilla JS UI

## Project Structure

```
src/
  content/           Content script (injected into pages)
    engine.ts          State machine with typed event emitter
    types.ts           Core type definitions
    emitter.ts         Typed event emitter
    output.ts          Markdown output generation
    storage.ts         chrome.storage.local persistence
    sync.ts            Server sync (optional)
    detection/         Framework detectors (React, Svelte)
    dom/               DOM interaction, freeze, screenshots
    ui/                Shadow DOM UI (toolbar, markers, popups, settings)
  background/        Service worker
  popup/             Extension popup
scripts/
  build.ts           esbuild build script
tests/               vitest tests
```

## License

MIT
