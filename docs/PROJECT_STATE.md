# PROJECT_STATE.md

## Project

Ollama CV Creator PWA

## Current Phase

Implementation started.

## Current Stable State

TASK-013 completed. The app now has a job match analysis screen that displays the current project's match score, strengths, gaps, and recommendations from local job analysis data.

## Architecture Summary

- Next.js App Router fullstack app
- TypeScript strict mode
- Tailwind CSS UI
- Zustand state management
- React Hook Form + Zod validation
- IndexedDB local storage
- Ollama via backend API routes
- Playwright PDF export
- PWA installability

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

None

## Next Recommended Task

TASK-014: CV Generator API

## Known Risks

- Ollama may not be installed or reachable locally
- AI may return invalid JSON
- Prompt injection may appear in user-provided text
- PDF rendering may differ from preview
- Sensitive data must never be logged
- UI development may drift without early frontend shell

## Manual Testing Requirement

Build a minimal frontend shell early at TASK-005 so the user can manually test progress continuously.

## Last Test Results

- npm run typecheck: passed
- npm run test: passed
- npm run build: passed
- sensitive log scan for analysis UI/store: passed

## Last Update

2026-05-24: Completed TASK-013 job match analysis UI.
