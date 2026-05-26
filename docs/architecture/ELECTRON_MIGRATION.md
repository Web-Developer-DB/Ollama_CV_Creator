# ELECTRON_MIGRATION.md

## Goal

Move Ollama CV Creator from a browser-first Next.js PWA to a local-first Electron desktop app while preserving the current React UI, domain types, prompt builders, validation schemas, and tests where possible.

## Why Electron

- Ollama is a local runtime, so the app naturally belongs on the user's machine.
- CV data is sensitive and should remain local.
- Desktop APIs give better control over project import/export, file locations, and PDF output.
- A packaged app can provide a clearer user experience than asking users to run a local web server.

## Target Runtime

```txt
Electron Main Process
  ├─ creates BrowserWindow
  ├─ owns Ollama service calls
  ├─ owns local storage
  ├─ owns export/file dialogs
  └─ exposes typed IPC handlers

Electron Preload
  └─ exposes a small `window.desktopApi` facade

React Renderer
  ├─ uses existing screens/components
  ├─ calls desktopApi instead of Next.js API routes
  └─ never receives direct Node.js access
```

## Migration Strategy

1. Add Electron shell without changing product behavior.
2. Extract current API route logic into framework-independent service functions.
3. Add typed IPC handlers and preload API for AI, storage, and export.
4. Replace renderer `fetch("/api/...")` calls with desktop service calls.
5. Move project persistence from IndexedDB to desktop-owned storage, keeping JSON import/export as a migration escape hatch.
6. Replace PWA packaging tasks with desktop packaging tasks.

## Boundaries

- Renderer components must not import Node.js modules.
- Renderer components must not call Ollama directly.
- Main-process services must validate all renderer inputs with Zod.
- Generated AI data must remain reviewable before export.
- Sensitive profile or job data must not be logged.

## Open Decisions

- Desktop storage backend: JSON files, SQLite, or another embedded local store.
- PDF export path: Electron `webContents.printToPDF`, Playwright, or a shared renderer export view.
- Packaging target priority: Linux first, then Windows/macOS if needed.
