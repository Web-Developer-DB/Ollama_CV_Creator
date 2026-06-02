import type {
  GeneratedCoverLetter,
  GeneratedCV,
  GeneratedDocuments
} from "@/types/documents";

// Converts structured generated documents into editable textarea drafts and
// back again. The screen owns user interaction; this module owns draft shaping.
export const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const splitParagraphs = (value: string): string[] =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const cvToText = (cv: GeneratedCV | undefined): string => {
  if (!cv) {
    return "";
  }

  const sectionText = cv.sections
    .flatMap((section) =>
      section.items.flatMap((item) => [
        item.title,
        item.subtitle,
        item.dateRange,
        item.body,
        ...item.bullets
      ])
    )
    .filter(Boolean)
    .join("\n");

  return [cv.summary, sectionText].filter(Boolean).join("\n\n");
};

export const coverLetterToText = (
  coverLetter: GeneratedCoverLetter | undefined
): string => {
  if (!coverLetter) {
    return "";
  }

  return [
    coverLetter.opening,
    ...coverLetter.body,
    coverLetter.closing,
    coverLetter.signature
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const createCVFromText = (
  text: string,
  existingCV: GeneratedCV | undefined,
  now: string
): GeneratedCV => ({
  id: existingCV?.id ?? createId(),
  title: existingCV?.title ?? "Edited CV",
  language: existingCV?.language ?? "de",
  summary: text,
  sections:
    existingCV?.sections.length === 0 || !existingCV?.sections
      ? [
          {
            id: "draft-section",
            type: "custom",
            title: "Draft",
            items: [
              {
                id: "draft-item",
                body: text,
                bullets: []
              }
            ]
          }
        ]
      : existingCV.sections,
  meta: {
    ...existingCV?.meta,
    generatedAt: existingCV?.meta.generatedAt ?? now
  }
});

export const createCoverLetterFromText = (
  text: string,
  existingCoverLetter: GeneratedCoverLetter | undefined,
  now: string
): GeneratedCoverLetter => {
  const paragraphs = splitParagraphs(text);
  const opening =
    paragraphs[0] ?? existingCoverLetter?.opening ?? "Draft cover letter";
  const closing =
    paragraphs.length > 1
      ? paragraphs[paragraphs.length - 1]
      : existingCoverLetter?.closing ?? "Sincerely,";

  return {
    id: existingCoverLetter?.id ?? createId(),
    language: existingCoverLetter?.language ?? "de",
    recipient: existingCoverLetter?.recipient,
    subject: existingCoverLetter?.subject,
    greeting: existingCoverLetter?.greeting,
    opening,
    body: paragraphs.slice(1, -1),
    closing,
    signature: existingCoverLetter?.signature,
    meta: {
      ...existingCoverLetter?.meta,
      generatedAt: existingCoverLetter?.meta.generatedAt ?? now
    }
  };
};

export const collectStoredDocumentWarnings = (
  documents: GeneratedDocuments | undefined
): string[] =>
  Array.from(
    new Set([
      ...(documents?.cv?.meta.warnings ?? []),
      ...(documents?.coverLetter?.meta.warnings ?? [])
    ])
  );
