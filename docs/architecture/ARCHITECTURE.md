# ARCHITECTURE.md

## System Overview

The app is a local-first fullstack Next.js PWA.

```txt
PWA Frontend
  ├─ Dashboard
  ├─ Import
  ├─ Profile Review
  ├─ Job Analysis
  ├─ Document Generator
  ├─ Template Preview
  └─ Export

Next.js API Routes
  ├─ AI Routes
  └─ Export Routes

Ollama
  └─ Local LLM Runtime

Local Storage
  └─ IndexedDB
```

## Directory Structure

```txt
src/
  app/
    api/
      ai/
      export/
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
```

## API Flow

```txt
Frontend
 → API route
 → input validation
 → prompt builder
 → Ollama client
 → JSON parse
 → Zod validation
 → business validation
 → response
```

## Forbidden

- Ollama calls from React components
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
