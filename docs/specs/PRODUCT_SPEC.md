# PRODUCT_SPEC.md

## Product Name

Ollama CV Creator PWA

## Goal

Create a local-first PWA that turns raw candidate text into professional application documents.

## Main Workflow

1. User creates a project
2. User imports raw unstructured text
3. AI extracts structured profile data
4. User reviews and edits extracted profile
5. User imports a job posting
6. AI analyzes job posting
7. App shows match analysis
8. AI generates targeted CV
9. AI generates tailored cover letter
10. User selects template/style
11. User previews documents
12. User exports PDF and project JSON

## MVP Features

- Dashboard
- Project management
- Raw text import
- Candidate profile extraction
- Profile review/editing
- Job posting import
- Job analysis
- Job match analysis
- CV generation
- Cover letter generation
- Modern/classic/minimal templates
- Live preview
- PDF export
- JSON project export
- Local storage
- PWA installability

## Out of Scope for MVP

- User accounts
- Cloud sync
- External AI APIs
- DOCX export
- Template marketplace
- Application tracking
- Team collaboration

## MVP Routes

- `/dashboard`
- `/import`
- `/profile`
- `/job`
- `/analysis`
- `/documents`
- `/templates`
- `/export`

## Template Styles

### Modern

For tech, startups, product, marketing.

### Classic

For banks, public sector, industry, administration.

### Minimal

ATS-friendly, clean, highly readable.

## UX Requirements

- professional
- clean
- trustworthy
- responsive
- manually editable
- clear loading states
- clear error states
- no hidden AI changes
