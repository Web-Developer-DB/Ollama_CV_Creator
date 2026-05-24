import { z } from "zod";
import { buildGenerateCoverLetterPrompt } from "@/lib/ai/prompts/generate-cover-letter";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  candidateProfileSchema,
  generatedCoverLetterSchema,
  jobAnalysisSchema,
  jobTargetSchema,
  jobToneSchema
} from "@/lib/validation/schemas";
import type { ApiErrorCode, ApiResponse } from "@/types/api";
import type { GeneratedCoverLetter } from "@/types/documents";
import type { JobAnalysis, JobTarget } from "@/types/job";
import type { CandidateProfile, WorkExperience } from "@/types/profile";

const generateCoverLetterRequestSchema = z.object({
  candidateProfile: candidateProfileSchema,
  jobTarget: jobTargetSchema,
  jobAnalysis: jobAnalysisSchema,
  options: z.object({
    language: z.enum(["de", "en"]),
    tone: jobToneSchema
  })
});

const errorStatusByCode: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  OLLAMA_UNAVAILABLE: 503,
  AI_TIMEOUT: 504,
  INVALID_AI_JSON: 502,
  SCHEMA_VALIDATION_FAILED: 502,
  BUSINESS_RULE_FAILED: 422,
  HALLUCINATION_DETECTED: 422,
  EXPORT_FAILED: 500
};

const createJsonResponse = <T>(
  payload: ApiResponse<T>,
  status: number
): Response =>
  Response.json(payload, {
    status
  });

const createErrorResponse = (
  code: ApiErrorCode,
  message: string
): Response =>
  createJsonResponse(
    {
      success: false,
      error: {
        code,
        message
      }
    },
    errorStatusByCode[code]
  );

const hasText = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

const hasArrayValues = (values: string[] | undefined): boolean =>
  Array.isArray(values) && values.some((value) => value.trim().length > 0);

const hasExperienceFacts = (experience: WorkExperience): boolean =>
  [
    experience.company,
    experience.role,
    experience.location,
    experience.startDate,
    experience.endDate,
    experience.description
  ].some(hasText) ||
  hasArrayValues(experience.responsibilities) ||
  hasArrayValues(experience.achievements) ||
  hasArrayValues(experience.technologies);

const hasCandidateFacts = (candidateProfile: CandidateProfile): boolean =>
  Object.values(candidateProfile.personalInfo).some(hasText) ||
  hasText(candidateProfile.summary) ||
  candidateProfile.experiences.some(hasExperienceFacts) ||
  candidateProfile.education.length > 0 ||
  candidateProfile.projects.length > 0 ||
  candidateProfile.languages.length > 0 ||
  candidateProfile.certificates.length > 0 ||
  Object.values(candidateProfile.skills).some(hasArrayValues);

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();

const compactFacts = (values: Array<string | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .filter((value): value is string => hasText(value))
        .map(normalizeText)
        .filter(Boolean)
    )
  );

const includesKnownFact = (value: string, knownFacts: string[]): boolean => {
  const normalizedValue = normalizeText(value);

  return knownFacts.some(
    (knownFact) =>
      normalizedValue === knownFact ||
      normalizedValue.includes(knownFact) ||
      knownFact.includes(normalizedValue)
  );
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
  !hasText(term) || normalizeText(text).includes(normalizeText(term ?? ""));

const usesTargetCompanyAndRole = (
  coverLetter: GeneratedCoverLetter,
  jobTarget: JobTarget
): boolean => {
  const letterText = collectLetterText(coverLetter);

  return (
    containsTerm(letterText, jobTarget.company) &&
    containsTerm(letterText, jobTarget.title)
  );
};

const countWords = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

const hasReasonableLength = (coverLetter: GeneratedCoverLetter): boolean =>
  coverLetter.body.length <= 4 && countWords(collectLetterText(coverLetter)) <= 450;

const collectKnownSkills = (candidateProfile: CandidateProfile): string[] =>
  compactFacts([
    ...candidateProfile.skills.technical,
    ...candidateProfile.skills.soft,
    ...candidateProfile.skills.tools,
    ...candidateProfile.skills.languages,
    ...candidateProfile.skills.methods,
    ...candidateProfile.experiences.flatMap(
      (experience) => experience.technologies ?? []
    ),
    ...candidateProfile.projects.flatMap((project) => project.technologies ?? []),
    ...candidateProfile.languages.map((language) => language.language)
  ]);

const collectJobSkillSignals = (jobAnalysis: JobAnalysis): string[] =>
  compactFacts([
    ...jobAnalysis.requiredSkills,
    ...jobAnalysis.optionalSkills,
    ...jobAnalysis.softSkills
  ]);

const mentionsUnsupportedJobSkill = (
  coverLetter: GeneratedCoverLetter,
  candidateProfile: CandidateProfile,
  jobAnalysis: JobAnalysis
): boolean => {
  const knownSkills = collectKnownSkills(candidateProfile);
  const unsupportedJobSkills = collectJobSkillSignals(jobAnalysis).filter(
    (skill) => !includesKnownFact(skill, knownSkills)
  );
  const letterText = normalizeText(collectLetterText(coverLetter));

  return unsupportedJobSkills.some((skill) => letterText.includes(skill));
};

const collectAllowedCompanies = (
  candidateProfile: CandidateProfile,
  jobTarget: JobTarget
): string[] =>
  compactFacts([
    ...candidateProfile.experiences.map((experience) => experience.company),
    jobTarget.company
  ]);

const companyLikePattern =
  /\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)*\s+(?:GmbH|AG|Inc|LLC|Ltd|Corp|Corporation|Company)\b/g;

const mentionsUnknownCompany = (
  coverLetter: GeneratedCoverLetter,
  candidateProfile: CandidateProfile,
  jobTarget: JobTarget
): boolean => {
  const allowedCompanies = collectAllowedCompanies(candidateProfile, jobTarget);
  const letterText = collectLetterText(coverLetter);
  const companies = letterText.match(companyLikePattern) ?? [];

  return companies.some((company) => !includesKnownFact(company, allowedCompanies));
};

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_INPUT", "Request body must be JSON");
  }

  const parsedRequest = generateCoverLetterRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return createErrorResponse(
      "INVALID_INPUT",
      "Candidate profile, job target, job analysis and cover letter options are required"
    );
  }

  if (!hasCandidateFacts(parsedRequest.data.candidateProfile)) {
    return createErrorResponse(
      "BUSINESS_RULE_FAILED",
      "Candidate profile must contain usable facts"
    );
  }

  const prompt = buildGenerateCoverLetterPrompt(parsedRequest.data);

  try {
    const aiCoverLetter = await generateOllamaJson<unknown>(prompt);
    const parsedCoverLetter = generatedCoverLetterSchema.safeParse(aiCoverLetter);

    if (!parsedCoverLetter.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the generated cover letter schema"
      );
    }

    if (
      !usesTargetCompanyAndRole(
        parsedCoverLetter.data,
        parsedRequest.data.jobTarget
      )
    ) {
      return createErrorResponse(
        "BUSINESS_RULE_FAILED",
        "Generated cover letter must use the target company and role when present"
      );
    }

    if (!hasReasonableLength(parsedCoverLetter.data)) {
      return createErrorResponse(
        "BUSINESS_RULE_FAILED",
        "Generated cover letter is too long"
      );
    }

    if (
      mentionsUnsupportedJobSkill(
        parsedCoverLetter.data,
        parsedRequest.data.candidateProfile,
        parsedRequest.data.jobAnalysis
      ) ||
      mentionsUnknownCompany(
        parsedCoverLetter.data,
        parsedRequest.data.candidateProfile,
        parsedRequest.data.jobTarget
      )
    ) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        "Generated cover letter contains facts not present in the candidate profile"
      );
    }

    return createJsonResponse<GeneratedCoverLetter>(
      {
        success: true,
        data: parsedCoverLetter.data
      },
      200
    );
  } catch (error) {
    if (error instanceof OllamaClientError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
}
