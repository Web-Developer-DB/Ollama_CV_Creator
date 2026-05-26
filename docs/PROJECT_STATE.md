# PROJECT_STATE.md

## Project

Ollama CV Creator Desktop

## Current Phase

Desktop migration planning phase.

## Current Stable State

TASK-018 completed. The templates screen now has a live document preview: changing the selected template immediately updates the preview, and CV, cover letter or combined preview modes can be toggled without leaving the page.

Ad-hoc Ollama status/settings feature completed. The app now has an AI Status navigation item with an Ollama connection check, local connect/disconnect UI state, installed model discovery through `/api/ai/status`, local model selection, and selected model readiness metadata. The UI distinguishes Ollama reachability from LLM readiness, so an empty model list is shown as no model loaded instead of connected.

Planning update accepted: PDF export is deferred until the app UI and document renderer are professionally styled. The new task sequence starts with design system foundation, then app UX polish, document renderer v2, template pack, template selection UX, and styled PDF export.

TASK-019 completed. The app now has shared design primitives for buttons, badges, and panels, refreshed global UI tokens, a cleaner application shell, and more polished header/sidebar styling as the foundation for the next UX pass.

AI Status bugfix completed. The status endpoint now checks Ollama `/api/ps` in addition to `/api/tags`, so installed models and models currently loaded into memory are distinct. The AI page only shows Connected/Ready when the selected model is actually loaded.

TASK-020 completed. The app now uses a clearer information architecture: grouped navigation, an overview dashboard with a visible start point, workflow dependencies, expected outputs for each step, and readiness checks for the data and AI model needed before document generation/export.

TASK-021 completed. CV creation and optional job matching are now separated in the workflow. Import is now candidate intake with demo candidate context, local context saving, and an Extract profile action that calls `/api/ai/extract-profile` and stores an editable candidate profile before CV generation.

Ad-hoc AI readiness guard completed. The Ollama client now checks `/api/tags` and `/api/ps` before every generation call and fails with `AI_MODEL_NOT_READY` when the configured model is installed but not loaded. Candidate profile extraction also checks `/api/ai/status` before calling the extraction route and links users to AI Status when the model is not ready.

Ad-hoc extract-profile robustness fix completed. Local reasoning models such as `qwen3.5:4b` may return generated JSON in Ollama's `thinking` field while `response` is empty. The Ollama client now falls back to `thinking`, extracts JSON from common wrappers, and the profile extraction route normalizes null or empty optional fields before schema validation.

Ad-hoc profile review UI polish completed. Skill lists now use multi-line textareas so long extracted skill sets remain readable, and the uncertain-fields panel uses a neutral style when no uncertain fields or warnings were reported.

Ad-hoc comprehensive demo context completed. The first-run import context now includes detailed school education, college preparation, vocational training, university education, continuing education, certifications, multiple companies, selected projects, long skill lists, and languages. The extract-profile prompt and normalizer were updated to preserve many education, training, certification, project, and work-history entries as structured arrays. JSON generation now sends `think: false` by default so Qwen/Ollama returns schema JSON in `response` instead of spending time in reasoning output.

Architecture direction update accepted: the project should migrate from a browser-first Next.js PWA to an Electron desktop application because the app is local-first, depends on local Ollama models, handles sensitive CV data, and benefits from controlled local filesystem/export capabilities.

## Architecture Summary

- Electron desktop app target
- React renderer
- TypeScript strict mode
- Tailwind CSS UI
- Zustand state management
- React Hook Form + Zod validation
- Desktop-owned local storage target
- Ollama via Electron main-process services
- PDF export through desktop export service
- Desktop installability

## Core Principles

- Local first
- Privacy by design
- Human-in-the-loop
- Test-first development
- Schema-first AI
- No hallucinated facts
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
- PDF export plan
- Security plan
- Testing strategy
- Kanban/TDD workflow

## In Progress

Electron migration planning.

## Next Recommended Task

TASK-033: Electron Migration Plan and Shell

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
- npm run test: passed, 103 tests
- npm run build: passed
- sensitive log scan for app/components/lib: passed
- frontend styling constraint scan for letter spacing and arbitrary text sizing: passed
- manual dev-server check for `/api/ai/status`: passed, installed model detected but not loaded
- manual dev-server check for `/api/ai/extract-profile`: passed, returns `AI_MODEL_NOT_READY` when no model is loaded and returns a normalized profile when `qwen3.5:4b` is loaded
- runtime environment check: current agent shell is WSL2 (`microsoft-standard-WSL2`); native Linux testing still needs to be run from the Linux PC shell

## Last Update

2026-05-26: Accepted Electron desktop runtime direction. Next recommended task is TASK-033 Electron Migration Plan and Shell.
