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

const hasText = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeText = (value: string | undefined): string =>
  value?.replace(/\s+/g, " ").trim() ?? "";

const splitCvDraft = (text: string): { rest: string; summary?: string } => {
  const paragraphs = splitParagraphs(text);

  return {
    summary: paragraphs[0],
    rest: paragraphs.slice(1).join("\n\n")
  };
};

export const cvToText = (cv: GeneratedCV | undefined): string => {
  if (!cv) {
    return "";
  }

  const sectionText = cv.sections
    .filter(
      (section) =>
        section.type !== "summary" ||
        !hasText(cv.summary) ||
        section.items.some(
          (item) => normalizeText(item.body) !== normalizeText(cv.summary)
        )
    )
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
): GeneratedCV => {
  const { rest, summary } = splitCvDraft(text);
  const existingSections = existingCV?.sections ?? [];
  const draftSection =
    !existingCV || existingSections.length === 0
      ? rest
        ? [
            {
              id: "draft-section",
              type: "custom" as const,
              title: "Draft",
              items: [
                {
                  id: "draft-item",
                  body: rest,
                  bullets: []
                }
              ]
            }
          ]
        : []
      : existingSections;

  return {
    id: existingCV?.id ?? createId(),
    title: existingCV?.title ?? "Edited CV",
    language: existingCV?.language ?? "de",
    contact: existingCV?.contact,
    summary,
    sections: draftSection,
    meta: {
      ...existingCV?.meta,
      generatedAt: existingCV?.meta.generatedAt ?? now
    }
  };
};

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
