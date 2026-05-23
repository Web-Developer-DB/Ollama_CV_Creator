# TEST_STRATEGY.md

## Principle

All core logic must be developed test-first.

## Test Layers

1. Unit tests
2. Schema tests
3. API tests
4. UI tests
5. E2E tests
6. Security checks

## Tools

- Vitest
- React Testing Library
- Playwright
- TypeScript strict mode
- Zod

## Required Checks

Each task must define relevant checks.

## Early Frontend Manual Testing

At TASK-005, create a minimal frontend shell so the user can manually test navigation and app status.

## AI Tests

Test cases:

- clean raw text
- chaotic raw text
- missing dates
- multiple employers
- mixed German/English text
- prompt injection in raw text
- prompt injection in job posting
- invalid AI JSON
- schema mismatch

## Export Tests

PDF must:

- generate successfully
- use A4
- not clip content
- render modern/classic/minimal templates
- fail safely if content missing

## Security Checks

- no sensitive logs
- no external AI calls
- no raw data in URLs
- prompt injection handled
- AI output validated
