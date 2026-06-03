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

Ad-hoc Ollama shutdown cleanup completed. The Electron main process now intercepts app quit, reads currently loaded Ollama models from `/api/ps`, unloads each unique model with `keep_alive: 0`, and then continues quitting even if Ollama is unreachable or one unload request fails.

TASK-036 completed. Desktop project persistence now lives in a dedicated Electron storage module with deterministic `projects.json` storage under Electron `userData`, validated save/load/list/delete behavior, desktop JSON import/export primitives, and a migration note for existing browser IndexedDB data.

TASK-023 completed. The template pack now includes Modern, Classic, Minimal, Executive, Technical, and Compact templates, each with dedicated renderer styling, mini-preview accents, category metadata, and category filtering on the template screen.

TASK-039 completed. The document creation flow now connects reviewed profiles directly to document generation. The Write Documents screen offers general CV, tailored CV, general cover letter, and tailored cover letter actions; tailored actions automatically create job analysis when it is missing. Profile now links to document creation, Design shows a clear empty state until documents exist, and AI Status persists the currently loaded model when local selection was stale.

Ad-hoc profile persistence fix completed. The app shell now hydrates projects from local storage on startup, selects the first stored project when no selection exists, and profile extraction now saves the candidate context before checking the model while updating the same project record with the extracted profile instead of creating a second project.

Ad-hoc Ollama runtime controls completed. AI Status now stores context-window and timeout presets, marks `*-cloud` models as cloud-backed through the local Ollama host, and all LLM routes receive the selected runtime options. The Write Documents screen now shows live generation phases and maps timeout, JSON, schema, model-readiness, and hallucination errors into clearer UI messages.

Ad-hoc direct Ollama Cloud API support completed. `OLLAMA_BASE_URL=https://ollama.com/api` is normalized to the cloud host, `OLLAMA_API_KEY` is sent only to Ollama Cloud requests, cloud-host models are treated as ready without local `/api/ps`, and Ollama JSON error payloads are surfaced in client/status diagnostics. Real cloud route testing with `gpt-oss:120b` passed for status, CV generation, and cover letter generation; cover letter parsing now normalizes recoverable cloud output shapes before schema validation.

TASK-040 completed. CV and cover letter generation now use a shared LLM document pipeline for tolerant output parsing before schema validation. The document validators allow normal missing real-world profile fields, accept source-backed translated skill wording such as German labels for English profile skills, continue blocking genuinely unsupported skills and employers, and prompt the model to tailor by emphasis and ordering rather than inventing new facts.

TASK-041 completed. Profile extraction now has a dedicated tolerant normalization module that accepts common LLM variants such as wrapped `candidate_profile` payloads, snake_case contact data, `work_experience` and `education_history`, string/object skill lists, German language proficiency labels, certificate strings, numeric dates, confidence percentages, and invalid optional emails that should be dropped instead of failing the whole profile. CV and cover letter normalization also accept more document wrapper aliases and CV item aliases such as `employer`, `tasks`, and `work_history`.

TASK-042 completed. CV and cover letter generation now use semantic fact validation for source-backed skills, employers, companies, certificates, education facts, and dates. The validation still accepts faithful translations and simplified skill wording, but returns structured hallucination details for unsupported generated facts so the UI can explain exactly what needs correction.

TASK-043 completed. Generated CVs and cover letters can now carry document-level warnings in `meta.warnings`. Missing real-world data such as name, contact details, summary, experience, skills, target title, or target company no longer blocks useful drafts; instead, the Documents screen shows an amber warning panel while preserving red errors for actual generation or hallucination failures.

TASK-044 completed. CV and cover letter prompts now explicitly define the candidate profile as the only candidate fact source, forbid invented personal details, motivations, metrics, dates, employers, education, certificates, projects, tools, skills, and achievements, and explain that job context may only change emphasis, ordering, section choice, and wording. The prompts also tell models to leave `meta.warnings` empty because the app adds warnings after validation.

Ad-hoc architecture and code-clean audit completed. Core modules, screens, services, storage adapters, Electron bridge files, prompt builders, schemas, and canonical type files now have concise English module-boundary comments. Document draft conversion was extracted from `DocumentsScreen.tsx` into `document-drafts.ts`, and `docs/architecture/CODE_AGENT_MAP.md` now gives code agents a structured map of project flows, module responsibilities, rules, and common change paths.

Ad-hoc persistent LLM settings completed. AI Status now stores the selected model, inferred model kind, context window, and timeout in one combined browser-local settings record while preserving legacy selected-model/runtime keys. The renderer AI client reads this combined record before every LLM request, so profile extraction, job analysis, CV generation, and cover-letter generation reuse the last configured settings after an app restart until the user changes them.

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

Continue with TASK-037: Desktop Export Flow

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
- npm run test: passed, 199 tests
- npm run build: passed
- electron Ollama shutdown cleanup tests: passed
- electron desktop storage tests: passed
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

2026-06-01: Completed TASK-035 Electron IPC Bridge for AI and Storage, TASK-022 Document Renderer v2, the loaded Ollama model selection fix, the application redesign based on the supplied frame sketch, the dashboard live AI status fix, the profile review UX redesign, the full LLM model selection audit, Electron Ollama shutdown cleanup, TASK-036 Desktop Storage Migration, TASK-023 Template Pack, TASK-039 Document Creation UX Flow, the CV schema normalization fix, the profile persistence/hydration fix, the Ollama CV JSON compatibility/diagnostics fix, the Ollama runtime/cloud development controls, direct Ollama Cloud API support via environment configuration, and the real cloud cover-letter schema normalization fix.

2026-06-02: Completed TASK-040 Unified LLM Document Pipeline for tolerant CV and cover letter output parsing, source-backed translated skill validation, missing-profile-field tolerance, and stricter no-invention prompt wording. Next recommended task is TASK-037 Desktop Export Flow.

2026-06-02: Completed TASK-041 Tolerant Profile and Document Normalization for wrapped/snake_case profile payloads, broader profile aliases, German language levels, confidence/date coercion, and expanded document wrapper aliases. Next recommended task is TASK-037 Desktop Export Flow.

2026-06-02: Completed TASK-042 Semantic Fact Validation, TASK-043 Missing Data UX and Document Warnings, and TASK-044 Prompt Rewrite for No-Invention Document Generation. Next recommended task is TASK-037 Desktop Export Flow.

2026-06-02: Completed an architecture/code-clean audit with module-boundary comments, a focused Documents screen helper extraction, an updated architecture overview, and the new CODE_AGENT_MAP.md onboarding map. Next recommended task is TASK-037 Desktop Export Flow.

2026-06-02: Started TASK-045 A4 CV Page Renderer and TASK-046 Modern CV Visual Components. Follow-up document-design tasks are recorded as TASK-047 CV Template Design Pack, TASK-048 One-Page / Two-Page Fit Logic, and TASK-049 Print-Perfect Preview and Export.

2026-06-02: Completed TASK-045 A4 CV Page Renderer and TASK-046 Modern CV Visual Components. CV previews now render as DIN A4 pages with source-backed contact data, section icons, timeline styling for experience/education, skill chips, two-page preview support, and print-oriented A4 CSS. Next recommended task is TASK-047 CV Template Design Pack, followed by TASK-048 One-Page / Two-Page Fit Logic.

2026-06-03: Completed persistent LLM settings. Model selection, model kind, context-window preset, and timeout preset are now saved as a combined local settings object and automatically applied by all renderer AI requests after restarting the app.
