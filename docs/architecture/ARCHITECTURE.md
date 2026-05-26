# ARCHITECTURE.md

## System Overview

The target app is a local-first Electron desktop application.

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
  components/
    layout/
    forms/
    ai/
    preview/
    templates/
  lib/
    ai/
    export/
    storage/
    validation/
    templates/
  stores/
  hooks/
  types/
  config/
electron/
  main/
  preload/
  services/
```

## Desktop Service Flow

```txt
Renderer UI
 → preload bridge
 → main-process service
 → input validation
 → prompt builder
 → Ollama client
 → JSON parse
 → Zod validation
 → business validation
 → typed result
```

## Forbidden

- Ollama calls from React components
- direct Node.js access in renderer components
- sensitive data in logs
- unvalidated AI output stored as final data
- PDF generation in client state logic
- raw CV data in URL params

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
