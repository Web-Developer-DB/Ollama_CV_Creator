# TASKS_DETAILED.md

## TASK-001: Project Setup

Goal:
Create initial Next.js project with TypeScript, Tailwind and testing tools.

Files:
- package.json
- tsconfig.json
- next.config.js
- src/app/layout.tsx
- src/app/page.tsx

Tests/Checks:
- npm install succeeds
- npm run build succeeds
- TypeScript passes

Acceptance:
- App starts locally
- No TypeScript errors

## TASK-002: Base Types

Goal:
Create domain types.

Files:
- src/types/project.ts
- src/types/profile.ts
- src/types/job.ts
- src/types/documents.ts
- src/types/templates.ts
- src/types/api.ts

Acceptance:
- Types compile
- No circular imports

## TASK-003: Zod Schemas

Goal:
Create validation schemas.

Files:
- src/lib/validation/schemas.ts

Tests:
- valid profile accepted
- invalid email rejected
- invalid match score rejected
- optional fields allowed
- empty arrays allowed

## TASK-004: Storage Layer

Goal:
Create IndexedDB project storage and basic Zustand store.

Files:
- src/lib/storage/indexeddb.ts
- src/stores/project-store.ts

Tests:
- save project
- load project
- list projects
- delete project

## TASK-005: Early Frontend Shell

Goal:
Create minimal manually testable frontend.

Routes:
- dashboard
- import
- profile
- job
- analysis
- documents
- templates
- export

Requirements:
- visible app name
- simple navigation
- placeholder pages
- status card
- no fake backend behavior

Tests:
- dashboard renders
- nav links render
- placeholder pages render

## TASK-006: App Layout

Goal:
Build AppShell, Sidebar and Header.

Files:
- src/components/layout/AppShell.tsx
- src/components/layout/Sidebar.tsx
- src/components/layout/Header.tsx

## TASK-007: Import Screen

Goal:
Raw text input and save.

Tests:
- text entry works
- language select works
- raw input saved

## TASK-008: Ollama Client

Goal:
Create local Ollama client.

Files:
- src/lib/ai/ollama-client.ts
- src/config/ai-config.ts

Tests:
- base URL configured
- timeout handled
- unavailable Ollama handled
- response parsed

## TASK-009: AI Extract Profile API

Goal:
Raw text to CandidateProfile.

Files:
- src/app/api/ai/extract-profile/route.ts
- src/lib/ai/prompts/extract-profile.ts

Tests:
- empty text rejected
- invalid JSON handled
- schema validation failure handled
- successful extraction returns CandidateProfile

## TASK-010: Profile Review UI

Goal:
Editable candidate profile.

Tests:
- personal info editable
- experiences editable
- skills editable
- uncertain fields visible

## TASK-011: Job Import Screen

Goal:
Save job posting and options.

Tests:
- job title saved
- company saved
- description saved
- tone selected

## TASK-012: Job Analysis API

Goal:
Analyze job posting.

Tests:
- required skills extracted
- keywords extracted
- prompt injection ignored
- schema validated

## TASK-013: Job Match Analysis UI

Goal:
Show match score, strengths, gaps and recommendations.

Tests:
- score renders
- strengths render
- gaps render
- recommendations render

## TASK-014: CV Generator API

Goal:
Generate targeted CV.

Tests:
- no new employers
- no new skills
- valid GeneratedCV returned
- empty candidate rejected

## TASK-015: Cover Letter Generator API

Goal:
Generate tailored cover letter.

Tests:
- company/role used when present
- no invented facts
- valid structure
- reasonable length

## TASK-016: Documents Editor

Goal:
Editable CV and cover letter draft UI.

Tests:
- CV text editable
- cover letter text editable
- changes persist

## TASK-017: Template System

Goal:
Modern, Classic, Minimal templates.

Tests:
- each template renders
- missing fields do not crash
- CV and cover letter preview render

## TASK-018: Live Preview

Goal:
Live document preview with template switch.

Tests:
- template switch updates preview
- CV/cover letter toggle works

## TASK-019: PDF Export

Goal:
PDF export via Playwright.

Tests:
- CV PDF generated
- cover letter PDF generated
- missing document returns error
- no external JS used

## TASK-020: JSON Project Export

Goal:
Export/import project JSON.

Tests:
- project export valid JSON
- imported project validates schema

## TASK-021: Desktop Packaging

Goal:
Installable desktop app.

Tests:
- app name correct
- icons referenced
- desktop package builds
- app launches from packaged output

## TASK-022: Security Review

Goal:
Security and privacy checks.

Checks:
- no sensitive logs
- no external AI calls
- prompt injection tests exist
- validation cannot be bypassed

## TASK-023: MVP E2E Flow

Goal:
Complete user flow.

Flow:
Dashboard → Import → Profile → Job → Analysis → Documents → Templates → Export

## TASK-024: Final MVP Cleanup

Goal:
Final cleanup, docs, consistency.

Checks:
- docs updated
- README updated
- no dead files
- tests pass

## TASK-033: Electron Migration Plan and Shell

Goal:
Add an Electron desktop shell around the existing React experience without changing product behavior.

Files:
- electron/main/
- electron/preload/
- package.json
- vite/electron build config if selected

Tests/Checks:
- desktop window opens locally
- renderer loads current app shell
- no direct Node.js access from renderer
- TypeScript passes

Acceptance:
- App can be started as a desktop app in development
- Existing web tests still pass or have a documented migration path

## TASK-034: Extract Next.js API Logic into Services

Goal:
Move AI route logic into framework-independent service modules that can be called by Electron IPC handlers.

Files:
- src/lib/ai/
- src/lib/services/
- src/app/api/ai/*/route.ts

Tests:
- service tests cover extract profile, analyze job, generate CV, and generate cover letter
- API route tests become thin adapter tests or are replaced by service tests

## TASK-035: Electron IPC Bridge for AI and Storage

Goal:
Expose a narrow typed preload API for renderer calls.

Requirements:
- `ai.status`
- `ai.extractProfile`
- `ai.analyzeJob`
- `ai.generateCv`
- `ai.generateCoverLetter`
- `storage.listProjects`
- `storage.saveProject`
- `storage.deleteProject`

Acceptance:
- Renderer uses typed bridge calls instead of direct API route fetches
- Main process validates all incoming payloads

## TASK-036: Desktop Storage Migration

Goal:
Replace browser-only IndexedDB persistence with desktop-owned local storage.

Requirements:
- deterministic project location
- JSON project import/export path
- migration note for existing IndexedDB data
- tests for save/load/list/delete

## TASK-037: Desktop Export Flow

Goal:
Implement desktop-friendly PDF and project export.

Requirements:
- native save dialog
- validated project JSON export
- PDF generated from the same document renderer used in preview
- clear export error states
