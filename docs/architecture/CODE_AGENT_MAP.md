# CODE_AGENT_MAP.md

## Purpose

This file is a fast orientation map for code agents and developers. It explains
how the Ollama CV Creator is structured, where domain logic lives, and which
files should be changed for common tasks.

## Architecture Snapshot

The app is a local-first CV and cover-letter desktop assistant.

```txt
React/Next.js renderer
  -> Zustand project store
  -> renderer facades in src/lib/api and src/lib/storage
  -> Electron preload bridge when running as desktop
  -> Electron IPC handlers or Next.js API routes
  -> framework-independent service layer
  -> Ollama local/cloud HTTP API
  -> Zod validation and semantic fact validation
  -> generated documents stored in local project state
```

The most important architectural rule:

```txt
candidateProfile is the only source of candidate facts.
jobTarget and jobAnalysis may only change emphasis, ordering, section choice,
and wording.
```

## Directory Responsibilities

### `src/app`

Route screens and thin API adapters.

- `src/app/shell.tsx`: dashboard shell and reusable placeholder frame.
- `src/app/import/ImportScreen.tsx`: "Profil erstellen" screen for raw profile source data and profile extraction.
- `src/app/profile/ProfileScreen.tsx`: profile review/correction before documents are generated, applies source-backed profile structure repair on load, plus current project deletion.
- `src/app/job/JobScreen.tsx`: optional target-role context.
- `src/app/analysis/AnalysisScreen.tsx`: read-only view of saved job analysis.
- `src/app/documents/DocumentsScreen.tsx`: document generation workflow, warnings, text editing, save actions, and design-preview handoff.
- `src/app/documents/document-drafts.ts`: pure helpers for converting structured documents to editable drafts and back; keep CV summary separate from the rest of the draft text.
- `src/app/templates/TemplatesScreen.tsx`: template selection and live preview.
- `src/app/ai/AiSettingsScreen.tsx`: Ollama status, selected model, context window, and timeout presets.
- `src/app/api/ai/*/route.ts`: thin HTTP adapters. They should not contain business logic.

### `src/components`

Reusable rendering components.

- `components/layout`: app shell, sidebar, header, and project hydration.
- `components/ui`: small primitives such as button, badge, panel, icon.
- `components/templates/DocumentTemplate.tsx`: printable A4 CV and cover-letter preview renderer with contact icons, timeline sections, skill chips, and template styling.
- `components/dashboard/DashboardAiStatus.tsx`: compact AI readiness card for the dashboard.

### `src/lib/ai`

Low-level Ollama and prompt infrastructure.

- `ollama-client.ts`: generation calls, timeouts, streaming aggregation, JSON extraction.
- `ollama-readiness.ts`: checks host reachability and selected/loaded model state.
- `ollama-http.ts`: local/cloud host header handling.
- `llm-settings.ts`: combined browser-local LLM settings record for selected model,
  model kind, context window, timeout, and legacy key synchronization.
- `runtime-settings.ts`: browser-local context-window and timeout presets.
- `selected-model.ts`: browser-local selected model key.
- `prompts/*`: prompt builders. They must repeat no-invention boundaries close to the model call.

### `src/lib/services/ai`

Framework-independent AI service layer. This is where business logic belongs.

- `extract-profile-service.ts`: raw text -> `CandidateProfile`.
- `context-window.ts`: automatic Ollama context-window estimation per request.
- `profile-normalization.ts`: tolerant LLM profile output normalization.
- `src/lib/profile/profile-structure.ts`: source-backed repair for ordered work and education blocks when an LLM placed headings into free-text fields or returned empty strings.
- `analyze-job-service.ts`: job description -> tailoring guidance.
- `generate-cv-service.ts`: profile -> generated CV with validation and warnings.
- `generate-cover-letter-service.ts`: profile -> generated cover letter with validation and warnings.
- `llm-document-pipeline.ts`: shared exact-parse then normalize-parse flow.
- `semantic-fact-validation.ts`: no-invention fact validation and missing-data warnings.
- `candidate-facts.ts`: normalized profile evidence matching, including translated skill labels.
- `ollama-status-service.ts`: model and host status.
- `model-control-service.ts`: model load/unload.

### `src/lib/storage`

Renderer-side storage facade.

- `project-storage.ts`: chooses Electron storage if available, IndexedDB fallback otherwise.
- `indexeddb.ts`: web/dev fallback project database.

### `src/stores`

Client state.

- `project-store.ts`: project list, selected project, load/save/delete lifecycle.

### `src/types`

Canonical data contracts.

- `profile.ts`: reviewed candidate facts.
- `job.ts`: optional target-role context.
- `documents.ts`: generated CV/cover letter structures.
- `project.ts`: top-level persisted project.
- `api.ts`: route, service, and IPC request/response contracts.
- `templates.ts`: presentation-only design model.

`GeneratedCV.contact` is copied from the verified candidate profile by the CV
generation service. The renderer should display it, but LLM output should not be
trusted as a source of contact facts.

### `src/lib/validation`

Zod schemas for runtime validation. Treat this as the boundary between untrusted
AI/storage input and typed application state.

### `electron`

Desktop host.

- `main.cjs`: BrowserWindow lifecycle and app shutdown.
- `preload.cjs`: narrow `window.desktopApi` bridge.
- `ipc.cjs`: validates renderer IPC payloads and proxies AI calls through route handlers.
- `project-storage.cjs`: desktop-owned local JSON storage and project import/export.
- `ollama-shutdown.cjs`: unloads local models during app exit.

## AI Generation Flow

```txt
DocumentsScreen
  -> src/lib/api/ai-client.ts
  -> Electron desktopApi.ai.* or /api/ai/*
  -> route adapter
  -> generate-cv-service / generate-cover-letter-service
  -> prompt builder
  -> generateOllamaJson
  -> parseLlmDocumentOutput
  -> generated document Zod schema
  -> semantic fact validation
  -> attach missing-data warnings
  -> project store save
```

## Profile Extraction Flow

```txt
ImportScreen
  -> save raw input to selected project
  -> extractProfile API/client
  -> extract-profile-service
  -> buildExtractProfilePrompt
  -> generateOllamaJson
  -> repair fenced/truncated JSON where possible
  -> normalizeCandidateProfileOutput
  -> candidateProfileSchema
  -> backfill clear facts from raw source text
  -> fall back to conservative source-text extraction when AI JSON is unusable
  -> replace active project with candidateProfile
```

## Document Generation Resilience

```txt
DocumentsScreen action
  -> generate CV / cover letter service
  -> ask selected Ollama model for structured JSON
  -> normalize recoverable aliases
  -> reject unsupported generated facts
  -> fall back to a deterministic source-backed draft instead of blocking
  -> attach warnings so the user can review what happened
```

## Storage Flow

```txt
ProjectHydrator
  -> useProjectStore.loadProjects()
  -> src/lib/storage/project-storage.ts
  -> Electron desktop storage if window.desktopApi exists
  -> IndexedDB fallback in web/dev/test

Candidate import
  -> useProjectStore.replaceProject()
  -> save the new workspace project
  -> delete older stored projects
  -> keep one active candidate profile for the single-user workflow
```

## Clean-Code Audit Notes

- The service layer is correctly separated from Next.js route adapters.
- React screens do not call Ollama directly.
- AI output is normalized and validated before being stored.
- Desktop IPC validates payloads before proxying or storage operations.
- `ProfileScreen.tsx` and `DocumentsScreen.tsx` are the largest UI modules. They
  are still understandable because helper sections and module comments are now
  explicit, but future large additions should extract smaller local modules.
- `DocumentsScreen.tsx` now delegates pure draft conversion to
  `document-drafts.ts`.
- See `docs/architecture/LLM_MODULE_AUDIT.md` for the detailed AI pipeline
  audit, resilience strategy, and remaining risks.

## Change Guidelines

- Put business rules in `src/lib/services`, not route handlers or components.
- Put prompt text only in `src/lib/ai/prompts`.
- Put UI-only state and event handling in route screens.
- Put reusable visual primitives in `src/components`.
- Put persisted shape changes in both `src/types` and `src/lib/validation/schemas.ts`.
- Add tests near the module being changed.
- Never store raw unvalidated LLM output as final data.
- Never let `jobTarget` or `jobAnalysis` add candidate facts.

## Common Tasks

- Add a new generated document field:
  update `src/types/documents.ts`, `src/lib/validation/schemas.ts`, relevant
  normalizer/service, template renderer, and route tests.

- Add a new profile field:
  update `src/types/profile.ts`, `schemas.ts`, `profile-normalization.ts`,
  `ProfileScreen.tsx`, and extraction tests.

- Change AI behavior:
  update the prompt builder, then update the matching service validation test.

- Change Electron storage:
  update `electron/project-storage.cjs`, `src/lib/storage/project-storage.ts`,
  `src/types/electron.d.ts`, and storage tests.

- Change model/runtime behavior:
  update `src/lib/ai/llm-settings.ts`, `src/lib/api/ai-client.ts`,
  `src/lib/services/ai/ollama-status-service.ts`, and
  `src/app/ai/AiSettingsScreen.tsx`.
