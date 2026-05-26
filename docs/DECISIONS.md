# DECISIONS.md

## ADR-001: Next.js App Router

Decision:
Use Next.js App Router for frontend and API routes.

Reason:
Allows a fullstack MVP with one codebase.

Status:
Superseded by ADR-008 for the desktop application direction.

## ADR-002: Local-first Storage

Decision:
Use IndexedDB for local project data.

Reason:
CV data is sensitive and should remain local.

## ADR-003: Ollama Local AI

Decision:
Use Ollama instead of external AI APIs.

Reason:
Improves privacy and avoids sending CV data to cloud providers.

## ADR-004: Schema-first AI

Decision:
All AI outputs must be JSON and validated with Zod.

Reason:
Prevents unstable UI state and reduces hallucination risk.

## ADR-005: Playwright PDF Export

Decision:
Use HTML/CSS rendering with Playwright for PDF export.

Reason:
Preview and export can share visual structure.

## ADR-006: Early Frontend Shell

Decision:
Create a manually testable frontend shell early.

Reason:
Allows the human user to validate progress continuously during development.

## ADR-007: Human-in-the-loop AI

Decision:
AI-generated or extracted data must be user-reviewable before final export.

Reason:
CV and cover letter correctness is high-risk and must not rely on blind AI output.

## ADR-008: Electron Desktop Runtime

Decision:
Migrate the app from a browser-first Next.js PWA to an Electron desktop app.

Reason:
The product is intentionally local-first, uses Ollama through local LLM models, handles sensitive CV data, and needs reliable local export workflows. Electron fits this runtime better than a PWA because it can package the UI, run a local application shell, access local files through controlled native APIs, and communicate with Ollama on `localhost` without making the app feel like a hosted web service.

Implementation notes:
- Keep React, TypeScript, Tailwind, Zustand, Zod, prompt builders, validation schemas, and document renderer code.
- Replace Next.js API routes with an Electron main-process service layer exposed through a narrow preload IPC bridge.
- Keep Ollama calls out of React components; renderer code must call typed desktop services instead.
- Move storage from browser-only IndexedDB to a desktop-owned local persistence layer, with an IndexedDB migration/export path if needed.
- Revisit Playwright PDF export after the Electron shell exists; Chromium-based rendering may allow a simpler native print-to-PDF path.
