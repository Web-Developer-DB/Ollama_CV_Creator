# API_SPEC.md

## Standard Response

```ts
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};
```

## Error Codes

- INVALID_INPUT
- OLLAMA_UNAVAILABLE
- AI_TIMEOUT
- INVALID_AI_JSON
- SCHEMA_VALIDATION_FAILED
- BUSINESS_RULE_FAILED
- HALLUCINATION_DETECTED
- EXPORT_FAILED

## Endpoints

### POST /api/ai/extract-profile

Input:

```json
{
  "text": "...",
  "language": "de"
}
```

Output:
CandidateProfile

### POST /api/ai/analyze-job

Input:

```json
{
  "jobDescription": "...",
  "language": "de"
}
```

Output:
JobAnalysis

### POST /api/ai/generate-cv

Input:

```json
{
  "candidateProfile": {},
  "jobTarget": {},
  "jobAnalysis": {},
  "options": {
    "language": "de",
    "length": "one_page",
    "style": "modern"
  }
}
```

Output:
GeneratedCV

### POST /api/ai/generate-cover-letter

Input:

```json
{
  "candidateProfile": {},
  "jobTarget": {},
  "jobAnalysis": {},
  "options": {
    "language": "de",
    "tone": "professional"
  }
}
```

Output:
GeneratedCoverLetter

### POST /api/ai/check-ats

Input:
GeneratedCV + JobAnalysis

Output:
ATS feedback

### POST /api/export/pdf

Input:

```json
{
  "documentType": "cv",
  "template": "modern",
  "theme": {},
  "content": {}
}
```

Output:
PDF file
