# TASK_BOARD.md

## BACKLOG

- TASK-007: Import Screen
- TASK-008: Ollama Client
- TASK-009: AI Extract Profile API
- TASK-010: Profile Review UI
- TASK-011: Job Import
- TASK-012: Job Analysis API
- TASK-013: CV Generator API
- TASK-014: Cover Letter Generator API
- TASK-015: Template System
- TASK-016: PDF Export
- TASK-017: PWA Setup
- TASK-018: Security Review
- TASK-019: MVP E2E Flow

## READY

- TASK-001: Project Setup
- TASK-002: Base Types
- TASK-003: Zod Schemas
- TASK-004: Storage Layer
- TASK-005: Early Frontend Shell
- TASK-006: App Layout

## IN_PROGRESS

_None_

## REVIEW

_None_

## DONE

_None_

## BLOCKED

_None_

---

# Task Details

## TASK-001: Project Setup

Status: READY
Priority: High
Mode: TDD
Area: Setup

Goal:
Create the initial Next.js TypeScript project structure with Tailwind and test tooling.

Tests:
- TypeScript check passes
- Build check passes

Acceptance Criteria:
- Project starts locally
- Basic app route exists
- No TypeScript errors

## TASK-002: Base Types

Status: READY
Priority: High
Mode: TDD
Area: Types

Goal:
Create central TypeScript domain types.

Files:
- src/types/project.ts
- src/types/profile.ts
- src/types/job.ts
- src/types/documents.ts
- src/types/templates.ts
- src/types/api.ts

## TASK-003: Zod Schemas

Status: READY
Priority: High
Mode: TDD
Area: Validation

Goal:
Create schema validation for project, profile, job, documents and API responses.

## TASK-004: Storage Layer

Status: READY
Priority: High
Mode: TDD
Area: Storage

Goal:
Create IndexedDB-based project storage.

## TASK-005: Early Frontend Shell

Status: READY
Priority: High
Mode: TDD
Area: Frontend

Goal:
Create a minimal manually testable frontend shell as early as possible.

Requirements:
- dashboard route
- simple navigation
- placeholder pages for MVP routes
- visible app status
- visible current project/task status placeholder
- basic responsive layout
- no fake backend behavior

Tests:
- dashboard renders
- navigation links render
- placeholder routes render
- app name is visible

Acceptance Criteria:
- User can start the app and manually click through the main routes
- UI clearly shows this is an early development shell
- Future tasks can be manually tested from this shell

## TASK-006: App Layout

Status: READY
Priority: Medium
Mode: TDD
Area: Frontend

Goal:
Replace or extend early shell with proper AppShell, Sidebar and Header.
