# AgentEye

Chrome extension — visual feedback tool for AI coding agents.

## Stack

- **Package manager**: bun
- **Test runner**: vitest (`bun run test`)
- **Build**: `bun run build` (esbuild via `scripts/build.ts`)
- **Language**: TypeScript (strict)

## Architecture

```
src/
  content/          # Content script (injected into pages)
    engine.ts       # State machine + typed event emitter (core)
    types.ts        # AgentEyeState, AgentEyeEvents, AgentEyeConfig, Annotation
    emitter.ts      # Generic typed EventEmitter
    output.ts       # Markdown generation (4 detail levels)
    storage.ts      # chrome.storage.local with localStorage fallback
    sync.ts         # HTTP client for MCP server sync
    dom/
      element-id.ts   # Selector generation, shadow DOM traversal
      freeze.ts       # Animation freezing (CSS, JS, video)
      interaction.ts  # Click/hover/drag/keyboard handlers
      screenshot.ts   # Capture utilities
    detection/
      types.ts        # FrameworkDetector interface
      registry.ts     # Auto-detect frameworks, unified query
      react.ts        # React fiber tree traversal
      svelte.ts       # Svelte 5 component detection
    ui/
      toolbar.ts      # Floating toolbar with SVG icons
      markers.ts      # Numbered annotation pins
      popup.ts        # Annotation text input
      hover-overlay.ts # Element highlight on hover
      settings-panel.ts # Detail level, clear-after-copy
      styles.css      # All styles (sulphur yellow on glassy black)
  background/       # Service worker
  popup/            # Extension popup (enable/disable toggle)
tests/              # vitest tests
```

## Key Patterns

- Engine is a state machine: mutable internal state, shallow-clone snapshots via `getState()`, `state:change` events
- UI renders inside **shadow DOM** — host has `pointer-events: none`, interactive children have `auto`
- CSS classes prefixed `agenteye-*`
- Framework detectors implement `FrameworkDetector` interface (add new ones in `detection/`)
- Settings persist to `chrome.storage.local`, loaded async on init
- Extension starts hidden per-site, toggled via popup, persisted per-origin

## Color Palette

Monochrome — white (`#ffffff`) accent on glassy black (`rgba(0,0,0,0.75)` + blur).
