// Framework-independent service for cover-letter generation. It applies the
// same no-invention validation as CV generation while enforcing letter length.
import { z } from "zod";
import { buildGenerateCoverLetterPrompt } from "@/lib/ai/prompts/generate-cover-letter";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  hasCandidateFacts,
  hasText,
  normalizeFact
} from "@/lib/services/ai/candidate-facts";
import {
  isRecord,
  parseLlmDocumentOutput,
  readRecordValue,
  readString,
  readStringArray,
  splitParagraphText
} from "@/lib/services/ai/llm-document-pipeline";
import {
  attachDocumentWarnings,
  collectMissingDataWarnings,
  formatSemanticFactErrorMessage,
  hasSemanticFactErrors,
  validateGeneratedCoverLetterFacts
} from "@/lib/services/ai/semantic-fact-validation";
import {
  createErrorResponse,
  createSuccessResponse
} from "@/lib/services/api-response";
import { resolveContextWindow } from "@/lib/services/ai/context-window";
import {
  candidateProfileSchema,
  generatedCoverLetterSchema,
  jobAnalysisSchema,
  jobTargetSchema,
  jobToneSchema
} from "@/lib/validation/schemas";
import type {
  AiRuntimeOptions,
  ApiResponse,
  GenerateCoverLetterRequest
} from "@/types/api";
import type { GeneratedCoverLetter } from "@/types/documents";
import type { JobTarget } from "@/types/job";

const generateCoverLetterRequestSchema = z.object({
  candidateProfile: candidateProfileSchema,
  jobTarget: jobTargetSchema.optional(),
  jobAnalysis: jobAnalysisSchema.optional(),
  model: z.string().trim().min(1).optional(),
  runtime: z
    .object({
      contextWindow: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional()
    })
    .optional(),
  options: z.object({
    language: z.enum(["de", "en"]),
    tone: jobToneSchema
  })
});

const createOllamaOptions = (
  model: string | undefined,
  runtime: AiRuntimeOptions | undefined
) => ({
  ...(model ? { model } : {}),
  ...(runtime?.timeoutMs ? { timeoutMs: runtime.timeoutMs } : {})
});

const unwrapGeneratedCoverLetter = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }

  const wrapped = readRecordValue(value, [
    "coverLetter",
    "cover_letter",
    "generatedCoverLetter",
    "generated_cover_letter",
    "generatedLetter",
    "generated_letter",
    "coverLetterDraft",
    "cover_letter_draft",
    "letter",
    "document",
    "data"
  ]);

  return isRecord(wrapped) ? wrapped : value;
};

const normalizeRecipient = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined;
  }

  const addressLines = readStringArray(
    readRecordValue(value, ["addressLines", "address_lines", "address"])
  );
  const recipient = {
    company: readString(value.company),
    contactName: readString(
      readRecordValue(value, ["contactName", "contact_name", "name"])
    ),
    ...(addressLines.length > 0 ? { addressLines } : {})
  };

  return recipient.company || recipient.contactName || recipient.addressLines
    ? recipient
    : undefined;
};

const normalizeGeneratedCoverLetter = (
  value: unknown,
  request: GenerateCoverLetterRequest
): GeneratedCoverLetter | undefined => {
  const root = unwrapGeneratedCoverLetter(value);

  if (!isRecord(root)) {
    return undefined;
  }

  const fullLetterText = readString(
    readRecordValue(root, ["letter", "text", "content", "message"])
  );
  const fullLetterParagraphs = fullLetterText
    ? splitParagraphText(fullLetterText)
    : [];
  const greetingFromText =
    fullLetterParagraphs[0] && /^dear|^sehr geehrte/i.test(fullLetterParagraphs[0])
      ? fullLetterParagraphs.shift()
      : undefined;
  const bodyParagraphs = [
    ...readStringArray(
      readRecordValue(root, [
        "body",
        "paragraphs",
        "bodyParagraphs",
        "body_paragraphs"
      ]),
      splitParagraphText
    ),
    ...fullLetterParagraphs
  ];
  const opening =
    readString(readRecordValue(root, ["opening", "introduction"])) ??
    bodyParagraphs.shift();
  const defaultClosing =
    request.options.language === "de"
      ? "Mit freundlichen Grüßen"
      : "Sincerely,";
  const closing =
    readString(readRecordValue(root, ["closing", "closingParagraph"])) ??
    bodyParagraphs.pop() ??
    defaultClosing;
  const meta = isRecord(root.meta) ? root.meta : {};
  const generatedAt = readString(
    readRecordValue(meta, ["generatedAt", "generated_at"])
  );

  if (!opening) {
    return undefined;
  }

  return {
    id: readString(root.id) ?? "generated-cover-letter",
    language:
      readString(root.language) === "en" || readString(root.language) === "de"
        ? (readString(root.language) as "en" | "de")
        : request.options.language,
    recipient: normalizeRecipient(root.recipient),
    subject: readString(root.subject),
    greeting: readString(root.greeting) ?? greetingFromText,
    opening,
    body: bodyParagraphs,
    closing,
    signature:
      readString(root.signature) ?? request.candidateProfile.personalInfo.fullName,
    meta: {
      generatedAt:
        generatedAt && !Number.isNaN(Date.parse(generatedAt))
          ? generatedAt
          : new Date().toISOString(),
      warnings: readStringArray(meta.warnings)
    }
  };
};

const collectLetterText = (coverLetter: GeneratedCoverLetter): string =>
  [
    coverLetter.recipient?.company,
    coverLetter.recipient?.contactName,
    ...(coverLetter.recipient?.addressLines ?? []),
    coverLetter.subject,
    coverLetter.greeting,
    coverLetter.opening,
    ...coverLetter.body,
    coverLetter.closing,
    coverLetter.signature
  ]
    .filter((value): value is string => hasText(value))
    .join("\n");

const containsTerm = (text: string, term: string | undefined): boolean =>
  !hasText(term) || normalizeFact(text).includes(normalizeFact(term ?? ""));

const usesTargetCompanyAndRole = (
  coverLetter: GeneratedCoverLetter,
  jobTarget: JobTarget | undefined
): boolean => {
  if (!jobTarget) {
    return true;
  }

  const letterText = collectLetterText(coverLetter);

  return (
    containsTerm(letterText, jobTarget.company) &&
    containsTerm(letterText, jobTarget.title)
  );
};

const countWords = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

const hasReasonableLength = (coverLetter: GeneratedCoverLetter): boolean =>
  coverLetter.body.length <= 4 &&
  countWords(collectLetterText(coverLetter)) <= 450;

const joinReadable = (values: string[]): string => values.filter(hasText).join(", ");

const isText = (value: string | undefined): value is string => hasText(value);

const createFallbackGeneratedCoverLetter = (
  request: GenerateCoverLetterRequest,
  warnings: string[]
): GeneratedCoverLetter => {
  const profile = request.candidateProfile;
  const language = request.options.language;
  const targetRole = request.jobTarget?.title;
  const targetCompany = request.jobTarget?.company;
  const isGerman = language === "de";
  const primaryExperience = profile.experiences.find(
    (experience) =>
      hasText(experience.role) ||
      hasText(experience.company) ||
      experience.responsibilities.length > 0
  );
  const technicalSkills = joinReadable(profile.skills.technical.slice(0, 8));
  const methods = joinReadable(profile.skills.methods.slice(0, 5));
  const experienceFacts = [
    primaryExperience?.role,
    primaryExperience?.company,
    primaryExperience?.responsibilities[0]
  ].filter(isText);
  const body = [
    profile.summary,
    experienceFacts.length > 0
      ? isGerman
        ? `Meine Erfahrung umfasst ${joinReadable(experienceFacts)}.`
        : `My experience includes ${joinReadable(experienceFacts)}.`
      : undefined,
    technicalSkills
      ? isGerman
        ? `Technisch arbeite ich mit ${technicalSkills}.`
        : `Technically, I work with ${technicalSkills}.`
      : undefined,
    methods
      ? isGerman
        ? `Ergänzend bringe ich Erfahrung mit ${methods} mit.`
        : `I also bring experience with ${methods}.`
      : undefined
  ].filter((paragraph): paragraph is string => hasText(paragraph));

  return {
    id: "generated-cover-letter-fallback",
    language,
    recipient: targetCompany ? { company: targetCompany } : undefined,
    subject: targetRole
      ? isGerman
        ? `Bewerbung als ${targetRole}`
        : `Application for ${targetRole}`
      : isGerman
        ? "Bewerbung"
        : "Application",
    greeting: isGerman ? "Sehr geehrte Damen und Herren," : "Dear hiring team,",
    opening: targetRole
      ? isGerman
        ? `hiermit bewerbe ich mich als ${targetRole}${targetCompany ? ` bei ${targetCompany}` : ""}.`
        : `I am applying for the ${targetRole} role${targetCompany ? ` at ${targetCompany}` : ""}.`
      : isGerman
        ? "hiermit sende ich Ihnen meine Bewerbungsunterlagen."
        : "I am sending my application documents for your review.",
    body:
      body.length > 0
        ? body.slice(0, 3)
        : [
            isGerman
              ? "Die beigefügten Profildaten enthalten belegte Erfahrungen und Fähigkeiten."
              : "The attached profile data contains verified experience and skills."
          ],
    closing: isGerman
      ? "Ich freue mich auf die Möglichkeit, meine Unterlagen weiter zu erläutern."
      : "I would welcome the opportunity to discuss my application further.",
    signature: profile.personalInfo.fullName,
    meta: {
      generatedAt: new Date().toISOString(),
      model: request.model,
      warnings
    }
  };
};

const createFallbackCoverLetterResponse = (
  request: GenerateCoverLetterRequest,
  warnings: string[]
): ApiResponse<GeneratedCoverLetter> =>
  createSuccessResponse(
    attachDocumentWarnings(
      createFallbackGeneratedCoverLetter(request, warnings),
      collectMissingDataWarnings(
        request.candidateProfile,
        "cover_letter",
        request.jobTarget
      )
    )
  );

export const generateCoverLetter = async (
  input: unknown
): Promise<ApiResponse<GeneratedCoverLetter>> => {
  const parsedRequest = generateCoverLetterRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return createErrorResponse(
      "INVALID_INPUT",
      "Candidate profile and cover letter options are required"
    );
  }

  const request: GenerateCoverLetterRequest = parsedRequest.data;

  if (!hasCandidateFacts(request.candidateProfile)) {
    return createErrorResponse(
      "BUSINESS_RULE_FAILED",
      "Candidate profile must contain usable facts"
    );
  }

  const prompt = {
    ...buildGenerateCoverLetterPrompt(request)
  };
  const runtimePrompt = {
    ...prompt,
    numCtx: resolveContextWindow({
      texts: [prompt.system, prompt.prompt],
      runtime: request.runtime,
      minimum: 8192,
      expectedOutputTokens: 2048,
      overheadTokens: 1024
    })
  };

  try {
    const aiCoverLetter = await generateOllamaJson<unknown>(
      runtimePrompt,
      createOllamaOptions(request.model, request.runtime)
    );

    // Cover-letter models frequently wrap or flatten paragraphs, so the shared
    // document pipeline gives normalization a chance before schema failure.
    const parsedCoverLetter = parseLlmDocumentOutput({
      value: aiCoverLetter,
      schema: generatedCoverLetterSchema,
      normalize: (value) => normalizeGeneratedCoverLetter(value, request),
      schemaErrorMessage:
        "AI response did not match the generated cover letter schema"
    });

    if (!parsedCoverLetter.success) {
      return createFallbackCoverLetterResponse(request, [
        "Das KI-Ergebnis hatte kein gültiges Anschreiben-Schema. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
      ]);
    }

    if (!usesTargetCompanyAndRole(parsedCoverLetter.data, request.jobTarget)) {
      return createFallbackCoverLetterResponse(request, [
        "Die KI-Antwort hat Zielrolle oder Unternehmen nicht korrekt verwendet. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
      ]);
    }

    if (!hasReasonableLength(parsedCoverLetter.data)) {
      return createFallbackCoverLetterResponse(request, [
        "Die KI-Antwort war zu lang. Die App hat einen kompakten belegten Entwurf direkt aus dem Profil erstellt."
      ]);
    }

    // Semantic validation catches invented job-skill claims and unknown
    // companies while still allowing source-backed translations.
    const semanticFactValidation = validateGeneratedCoverLetterFacts(
      parsedCoverLetter.data,
      request.candidateProfile,
      request.jobTarget,
      request.jobAnalysis
    );

    if (hasSemanticFactErrors(semanticFactValidation)) {
      return createFallbackCoverLetterResponse(request, [
        formatSemanticFactErrorMessage(semanticFactValidation),
        "Die KI-Antwort wurde verworfen. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
      ]);
    }

    // Missing profile details are user-facing warnings, not generation blockers.
    const coverLetterWithWarnings = attachDocumentWarnings(
      parsedCoverLetter.data,
      collectMissingDataWarnings(
        request.candidateProfile,
        "cover_letter",
        request.jobTarget
      )
    );

    return createSuccessResponse(coverLetterWithWarnings);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      if (error.code === "INVALID_AI_JSON" || error.code === "AI_TIMEOUT") {
        return createFallbackCoverLetterResponse(request, [
          error.code === "AI_TIMEOUT"
            ? "Die KI-Anfrage hat zu lange gedauert. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
            : "Die KI hat kein gültiges JSON erzeugt. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
        ]);
      }

      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
