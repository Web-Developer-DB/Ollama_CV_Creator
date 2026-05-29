# PROJECT_STATE.md

## Project

Ollama CV Creator Desktop

## Current Phase

Desktop migration implementation phase.

## Current Stable State

TASK-018 completed. The templates screen now has a live document preview: changing the selected template immediately updates the preview, and CV, cover letter or combined preview modes can be toggled without leaving the page.

Ad-hoc Ollama status/settings feature completed. The app now has an AI Status navigation item with an Ollama connection check, local connect/disconnect UI state, installed model discovery through `/api/ai/status`, local model selection, and selected model readiness metadata. The UI distinguishes Ollama reachability from LLM readiness, so an empty model list is shown as no model loaded instead of connected.

Planning update accepted: PDF export is deferred until the app UI and document renderer are professionally styled. The new task sequence starts with design system foundation, then app UX polish, document renderer v2, template pack, template selection UX, and styled PDF export.

TASK-019 completed. The app now has shared design primitives for buttons, badges, and panels, refreshed global UI tokens, a cleaner application shell, and more polished header/sidebar styling as the foundation for the next UX pass.

AI Status bugfix completed. The status endpoint now checks Ollama `/api/ps` in addition to `/api/tags`, so installed models and models currently loaded into memory are distinct. The AI page only shows Connected/Ready when the selected model is actually loaded.

TASK-020 completed. The app now uses a clearer information architecture: grouped navigation, an overview dashboard with a visible start point, workflow dependencies, expected outputs for each step, and readiness checks for the data and AI model needed before document generation/export.

TASK-021 completed. CV creation and optional role tailoring are now separated in the workflow. Import is now candidate intake with demo candidate context, local context saving, and an Extract profile action that calls `/api/ai/extract-profile` and stores an editable candidate profile before CV generation.

Ad-hoc AI readiness guard completed. The Ollama client now checks `/api/tags` and `/api/ps` before every generation call and fails with `AI_MODEL_NOT_READY` when the configured model is installed but not loaded. Candidate profile extraction also checks `/api/ai/status` before calling the extraction route and links users to AI Status when the model is not ready.

Ad-hoc extract-profile robustness fix completed. Local reasoning models such as `qwen3.5:4b` may return generated JSON in Ollama's `thinking` field while `response` is empty. The Ollama client now falls back to `thinking`, extracts JSON from common wrappers, and the profile extraction route normalizes null or empty optional fields before schema validation.

Ad-hoc profile review UI polish completed. Skill lists now use multi-line textareas so long extracted skill sets remain readable, and the uncertain-fields panel uses a neutral style when no uncertain fields or warnings were reported.

Ad-hoc comprehensive demo context completed. The first-run import context now includes detailed school education, college preparation, vocational training, university education, continuing education, certifications, multiple companies, selected projects, long skill lists, and languages. The extract-profile prompt and normalizer were updated to preserve many education, training, certification, project, and work-history entries as structured arrays. JSON generation now sends `think: false` by default so Qwen/Ollama returns schema JSON in `response` instead of spending time in reasoning output.

Architecture direction update accepted: the project should migrate from a browser-first Next.js PWA to an Electron desktop application because the app is local-first, depends on local Ollama models, handles sensitive CV data, and benefits from controlled local filesystem/export capabilities.

TASK-033 completed. The project has a minimal Electron main process, preload bridge, development launcher, Electron dependency, and a typed `window.desktopApi` runtime surface. The development launcher now removes `ELECTRON_RUN_AS_NODE` for the spawned Electron process so Electron starts correctly from the VS Code/Codex shell environment while the renderer still loads through Next.js during development.

TASK-034 completed. AI route logic has been extracted into framework-independent services under `src/lib/services/ai`, with shared API response mapping and thin Next.js route adapters. The extraction includes profile extraction, job analysis, CV generation, cover letter generation, Ollama status, and model control so the next Electron IPC task can call service functions instead of duplicating route behavior.

Ad-hoc Ollama model management completed. AI Status now provides model load/unload controls for the selected local model, visible loading/unloading feedback, automatic status refresh after model control actions, and runtime statistics from Ollama's loaded-model status such as memory, VRAM, keep-alive expiry, and digest.

Ad-hoc Candidate Intake interaction polish completed. The import screen now presents extraction as a candidate-profile creation workflow, shows whether the app is ready, checking the local model, extracting with the model, finished, or blocked by an error, and links directly to Profile after a successful extraction.

Product goal clarification accepted. The app's primary purpose is to create professional CVs and cover letters. Job descriptions are supporting context for tailoring those documents to a target role; matching analysis is not the end product. Future CV creation work should prioritize strong document design, visual presentation, editable content, and role-specific positioning based only on verified candidate data.

Ad-hoc full-app product audit completed. Navigation, dashboard, target-role workflow, tailoring guidance, document writing, design selection, export readiness, README, and frontend docs were adjusted toward the app goal: a modern local desktop assistant for creating polished CVs and cover letters from verified candidate data, optionally tailored to a target role.

Ad-hoc document preview polish completed. Template previews now render more like printable application pages, with stronger hierarchy, page-like white surfaces, clearer empty states, recipient display for cover letters, and template descriptions that explain the role fit of each design.

Ad-hoc desktop layout correction completed. The app shell now uses a consistent desktop layout without transform-based page scaling. Horizontal page and sidebar scrolling are suppressed, vertical page scrolling remains available for long workflows, and text/component sizing stays stable when switching between screens.

TASK-035 completed. Electron now registers a narrow IPC bridge for AI status, model control, profile extraction, job analysis, CV generation, cover letter generation, and project storage. The preload surface exposes typed `window.desktopApi` calls, renderer code uses bridge-aware AI and storage clients with web fallbacks, and main-process handlers validate incoming payloads before any desktop operation.

TASK-022 completed. The document renderer now presents CVs and cover letters as more polished page previews with template-specific page framing, headers, metadata, profile/letter structure, clearer empty states, and stable preview test IDs for future export work.

Ad-hoc loaded-model selection fix completed. LLM generation now resolves the actual loaded Ollama model from `/api/ps` before sending generation requests, so profile extraction, job analysis, CV generation, and cover letter generation no longer fall back to the default `OLLAMA_MODEL` when another local model is loaded. Candidate Intake and AI Status also prefer the loaded model over stale local selection state.

Ad-hoc application redesign completed from the supplied frame sketch. The app now uses a carded desktop window layout, icon-based sidebar navigation, compact KPI cards, dashboard quick-start/activity/status panels, refreshed profile overview with progress and skill chips, and template cards with mini previews. The visual system now follows the frame principles: clearer hierarchy, consistent cards, status accents, tighter spacing, and no horizontal overflow.

Ad-hoc dashboard AI status fix completed. The dashboard AI card now reads the live Ollama status instead of showing static demo text, and it only reports the model as ready when `/api/ai/status` returns at least one loaded model.

Ad-hoc profile review UX redesign completed. The profile page now uses real section tabs, direct editable skill chips with add/remove controls, editable experience selection, and dedicated education, certificate, and LLM-hint review panels so extracted profile facts can be corrected without working through comma-only textareas.

Ad-hoc LLM model selection audit completed. Production AI config no longer defines a fallback model name, `OLLAMA_MODEL` is no longer used as a runtime model selector, all LLM request paths accept and forward the selected local model, and status/readiness logic only treats installed and loaded Ollama models as usable.

## Architecture Summary

- Electron desktop app target
- React renderer
- TypeScript strict mode
- Tailwind CSS UI
- Zustand state management
- React Hook Form + Zod validation
- Desktop-owned local storage bridge, with full migration next
- Ollama through typed Electron bridge and framework-independent AI services
- PDF export through desktop export service
- Desktop installability

## Core Principles

- Local first
- Privacy by design
- Human-in-the-loop
- Test-first development
- Schema-first AI
- No hallucinated facts
- Document creation over matching
- Small Kanban tasks
- Early manual frontend shell

## Completed Planning

- Product scope
- MVP scope
- User flows
- Data model
- AI/Ollama architecture
- Prompt rules
- API structure
- Frontend structure
- Template system
- Professional document design direction
- PDF export plan
- Security plan
- Testing strategy
- Kanban/TDD workflow

## In Progress

None

## Next Recommended Task

Continue with TASK-036: Desktop Storage Migration

## Known Risks

- Ollama may not be installed or reachable locally
- AI may return invalid JSON
- Prompt injection may appear in user-provided text
- PDF rendering may differ from preview
- Sensitive data must never be logged
- Renderer/main-process boundaries must stay narrow and typed
- Storage migration must avoid losing existing browser IndexedDB project data

## Manual Testing Requirement

Build a minimal frontend shell early at TASK-005 so the user can manually test progress continuously.

## Last Test Results

- npm run typecheck: passed
- npm run test: passed, 130 tests
- npm run build: passed
- production model-name audit for `src` and `electron`: passed, no hard-coded LLM model names outside tests
- headless Chrome profile layout check: passed for `/profile` at 1280x900 and 1450x900 with no horizontal overflow
- headless Chrome visual smoke check: passed for `/`, `/profile`, `/templates`, and `/import` at 1512x920 with no horizontal overflow
- npm run dev:electron: passed; renderer served locally and Electron loaded the app with IPC handlers registered after the launcher removed `ELECTRON_RUN_AS_NODE`
- automated Chrome layout check: passed for `/`, `/import`, `/profile`, `/documents`, `/templates`, and `/ai` at 1280x860 with no horizontal document/body/sidebar scrolling, vertical scrolling enabled, no transform scaling, and stable 30px H1 sizing across screens
- sensitive log scan for app/components/lib: passed
- frontend styling constraint scan for letter spacing and arbitrary text sizing: passed
- manual dev-server check for `/api/ai/status`: passed, installed model detected but not loaded
- manual dev-server check for `/api/ai/extract-profile`: passed, returns `AI_MODEL_NOT_READY` when no model is loaded and returns a normalized profile when `qwen3.5:4b` is loaded
- runtime environment check: current agent shell exposes a Linux desktop display but also sets `ELECTRON_RUN_AS_NODE=1`; the launcher now strips that variable for Electron

## Last Update

2026-05-29: Completed TASK-035 Electron IPC Bridge for AI and Storage, TASK-022 Document Renderer v2, the loaded Ollama model selection fix, the application redesign based on the supplied frame sketch, the dashboard live AI status fix, the profile review UX redesign, and the full LLM model selection audit. Next recommended task is TASK-036 Desktop Storage Migration.
