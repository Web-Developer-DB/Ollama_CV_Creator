# TEST_STRATEGY.md

## Principle

All core logic must be developed test-first.

## Test Layers

1. Unit Tests
2. Schema Tests
3. API Tests
4. UI Tests
5. E2E Tests
6. Security Checks

## Tools

- Vitest
- React Testing Library
- Playwright
- TypeScript strict mode
- Zod

## Early Manual Frontend Testing

As soon as possible, the app must have a minimal frontend shell.

The shell must allow manual testing of:

- route navigation
- dashboard visibility
- placeholder MVP pages
- current app status
- future feature integration points

## Required Before DONE

A task can only move to DONE if:

- Relevant tests exist
- Tests pass
- TypeScript passes
- No sensitive logs are added
- PROJECT_STATE.md is updated
- TASK_BOARD.md is updated
- Manual test instructions are included when UI is affected
