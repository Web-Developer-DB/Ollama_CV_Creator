# LLM_MODULE_AUDIT.md

## Purpose

This audit describes the current LLM module from raw candidate text extraction
to profile storage and document generation. It is written as a handoff map for
developers and code agents who need to debug or extend AI behavior without
rescanning the whole project.

## Scope

- Candidate text extraction into `CandidateProfile`
- Profile normalization and source-text backfill
- Job description analysis
- General and tailored CV generation
- General and tailored cover-letter generation
- Ollama JSON parsing, timeout handling, and context-window sizing

## Core Rule

`candidateProfile` is the only source of candidate facts.

`jobTarget` and `jobAnalysis` may change emphasis, section order, tone, and
wording. They must not add experience, skills, companies, education, or
certificates that are not already present in the profile.

## Current Architecture

```txt
UI screen
  -> src/lib/api/ai-client.ts
  -> Electron IPC or Next.js API route
  -> framework-independent service in src/lib/services/ai
  -> prompt builder in src/lib/ai/prompts
  -> generateOllamaJson
  -> tolerant JSON extraction and repair
  -> normalizer
  -> Zod schema
  -> semantic validation / source-text backfill / deterministic fallback
  -> user-visible warnings
```

## Findings

### 1. Valid but incomplete profile JSON was treated as complete

Some models returned schema-valid profiles containing only name, skills,
education, or certificates. Older logic accepted this output and did not recover
missing contact details, work experience, or projects from the raw source text.

Status: fixed.

The extraction service now backfills clear source facts after schema validation:

- personal contact fields
- summary
- work experience
- education
- skills
- projects
- languages
- certificates

The backfilled profile is validated again before it is returned.

### 2. Invalid or truncated JSON caused hard failures

Local and smaller models sometimes produce fenced JSON, prose around JSON,
trailing commas, or truncated objects. Older parsing failed immediately.

Status: improved.

`generateOllamaJson` now tries multiple candidates:

- raw response
- fenced JSON blocks
- balanced JSON substring
- trailing-comma cleanup
- conservative closing-brace/bracket repair

If the model still returns unusable JSON during profile extraction, the app
creates a conservative source-text profile instead of blocking the user.

### 3. Fixed context windows were too small for long candidate text

Large candidate profiles can exceed an 8192-token runtime when prompt,
candidate text, expected output, and safety overhead are combined. This can
truncate output or make JSON invalid.

Status: fixed for current routes.

`src/lib/services/ai/context-window.ts` estimates required context from prompt
size and rounds up to stable presets:

```txt
4096 -> 8192 -> 16384 -> 32768
```

If the user-selected runtime context is smaller than the estimate, the service
uses the larger estimate for that call. This is applied to:

- profile extraction
- job analysis
- CV generation
- cover-letter generation

### 4. Semantic validation was too blocking for documents

The no-invention validator correctly caught hallucinated facts, but generation
could fail completely when the model used unsupported terms.

Status: improved.

CV and cover-letter services now fall back to deterministic source-backed
drafts when the LLM output is invalid, too long, or semantically unsafe. The UI
receives warnings instead of an empty draft.

### 5. Missing data should be warnings, not blockers

Real users may not know every date, company address, or summary sentence. The
app must still produce a usable draft that can be edited later.

Status: improved.

Missing-data checks now attach warnings to generated documents. They do not
block generation as long as the profile contains usable facts.

### 6. Single-user storage must avoid profile chaos

The product is intended for one active candidate. Importing and extracting new
candidate data should replace the active project/profile instead of accumulating
multiple competing profiles.

Status: implemented in the storage flow.

The project store replacement flow keeps one active candidate workspace and
desktop storage now recovers from corrupted project files by archiving the bad
file and starting with an empty list.

## Current Resilience Pipeline

### Profile extraction

```txt
raw candidate text
  -> build extraction prompt
  -> auto-size context window
  -> ask selected Ollama model
  -> parse / repair JSON
  -> normalize aliases into CandidateProfile
  -> Zod validate
  -> backfill missing clear facts from raw text
  -> Zod validate again
  -> if unusable: source-text fallback profile
```

### Document generation

```txt
candidateProfile + optional target role
  -> build document prompt
  -> auto-size context window
  -> ask selected Ollama model
  -> parse / normalize structured document
  -> Zod validate
  -> semantic no-invention validation
  -> if invalid or unsafe: deterministic profile-backed draft
  -> attach missing-data warnings
```

## Remaining Risks

- Extremely long inputs may still need chunked extraction. The current automatic
  context window prevents obvious undersizing, but it does not split text beyond
  the maximum preset.
- Source-text backfill is conservative. If the raw text has no recognizable
  headings, dates, or labels, it will not invent structure.
- Job analysis still returns an error on invalid schema. This is less damaging
  than profile/document failure because tailoring is optional, but a tolerant
  normalizer or fallback would be useful.
- Deterministic document fallback is safe and editable, but less polished than a
  strong cloud-model response.
- The current context estimate is approximate. It is intentionally biased toward
  larger windows to protect JSON completeness.

## Recommended Next Work

1. Add chunked profile extraction for very large source text:
   segment source text, extract partial facts, merge into one profile, validate.
2. Add an extraction coverage indicator in the UI:
   contact, experience, skills, education, projects, certificates.
3. Add a development-only AI response inspector:
   selected model, context window, timeout, parse status, warnings.
4. Add tolerant job-analysis fallback:
   extract required skills and keywords from source text if the model fails.
5. Add route tests for invalid raw email and very long profile text.
6. Keep improving semantic validation by allowing source-backed translations and
   normalized variants while rejecting unsupported facts.

## Files To Change For Future LLM Work

- `src/lib/ai/ollama-client.ts`
- `src/lib/ai/prompts/*`
- `src/lib/services/ai/context-window.ts`
- `src/lib/services/ai/extract-profile-service.ts`
- `src/lib/services/ai/profile-normalization.ts`
- `src/lib/services/ai/generate-cv-service.ts`
- `src/lib/services/ai/generate-cover-letter-service.ts`
- `src/lib/services/ai/semantic-fact-validation.ts`
- `src/lib/validation/schemas.ts`
- matching route/service tests
