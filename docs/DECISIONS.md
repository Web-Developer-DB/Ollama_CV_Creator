# DECISIONS.md

## ADR-001: Next.js App Router

Decision:
Use Next.js App Router for frontend and API routes.

Reason:
Allows fullstack MVP with one codebase.

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
Create a small manually testable frontend shell early in development.

Reason:
Allows continuous manual validation while the backend, storage, AI and export features are built incrementally.
