# PRODUCT_SPEC.md

## Product Name

Ollama CV Creator Desktop

## Goal

Create a local-first desktop app that turns raw candidate text into professionally designed CVs and cover letters using local Ollama models.

The main product goal is not to analyze whether a candidate matches a job as an end in itself. Job descriptions are used as tailoring context so the CV and cover letter can present the candidate's real experience, skills, and strengths in a way that is especially relevant and attractive for the target role.

## Main Workflow

1. User creates a project
2. User imports raw unstructured text
3. AI extracts structured profile data
4. User reviews and edits extracted profile
5. User imports a job posting
6. AI extracts role requirements and positioning cues from the job posting
7. App shows useful tailoring guidance
8. AI generates a targeted CV based on verified candidate data
9. AI generates a tailored cover letter based on verified candidate data
10. User selects template/style and visual presentation
11. User previews and edits professionally designed documents
12. User exports PDF and project JSON

## MVP Features

- Dashboard
- Project management
- Raw text import
- Candidate profile extraction
- Profile review/editing
- Job posting import
- Job analysis
- Job-based tailoring guidance
- CV generation
- Cover letter generation
- Professional CV and cover letter presentation
- Modern/classic/minimal templates
- Live preview
- PDF export
- JSON project export
- Local storage
- Desktop installability

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
