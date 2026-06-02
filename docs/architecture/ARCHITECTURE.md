# ARCHITECTURE.md

## System Overview

The target app is a local-first Electron desktop application.

For a current code-agent onboarding map with concrete file responsibilities,
see [CODE_AGENT_MAP.md](./CODE_AGENT_MAP.md).

```txt
Electron Renderer
  ├─ Dashboard
  ├─ Import
  ├─ Profile Review
  ├─ Job Analysis
  ├─ Document Generator
  ├─ Template Preview
  └─ Export

Electron Preload Bridge
  └─ Typed desktop API facade

Electron Main Process
  ├─ AI services
  ├─ Export services
  ├─ Storage services
  └─ Native file dialogs

Ollama
  └─ Local LLM Runtime

Local Storage
  └─ Desktop-owned local project database/files
```

## Directory Structure

```txt
src/
  app/
    dashboard/
    import/
    profile/
    job/
    analysis/
    documents/
    templates/
    export/
    api/ai/
  components/
    layout/
    dashboard/
    templates/
    ui/
  lib/
    ai/
    api/
    services/
    storage/
    validation/
    workflow/
  stores/
  types/
  config/
electron/
  main.cjs
  preload.cjs
  ipc.cjs
  project-storage.cjs
  ollama-shutdown.cjs
```

## Desktop Service Flow

```txt
Renderer UI
 → renderer facade (`src/lib/api` or `src/lib/storage`)
 → Electron preload bridge when desktop APIs are available
 → IPC proxy or Next.js API route
 → framework-independent service
 → prompt builder
 → Ollama client
 → JSON parse and tolerant normalization
 → Zod validation
 → semantic fact validation
 → typed result with optional warnings
```

## Forbidden

- Ollama calls from React components
- direct Node.js access in renderer components
- sensitive data in logs
- unvalidated AI output stored as final data
- PDF generation in client state logic
- raw CV data in URL params
- target-role requirements becoming candidate facts

## Local Runtime

Expected local runtime:

```bash
ollama pull qwen2.5:14b
ollama serve
npm run dev
```

## Migration Notes

- React screens and shared UI components should be preserved.
- Next.js API route handlers should be extracted into reusable service functions before being removed.
- Existing API tests should be converted into service tests.
- The Electron preload bridge must expose a small typed API, for example `ai.status`, `ai.extractProfile`, `ai.generateCv`, `storage.listProjects`, and `export.pdf`.
- Desktop storage should support import/export of project JSON so users are not locked into one machine state.
