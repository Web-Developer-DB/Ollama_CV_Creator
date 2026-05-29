import { z } from "zod";
import { buildGenerateCoverLetterPrompt } from "@/lib/ai/prompts/generate-cover-letter";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  compactFacts,
  hasCandidateFacts,
  hasText,
  includesKnownFact,
  normalizeFact
} from "@/lib/services/ai/candidate-facts";
import {
  createErrorResponse,
  createSuccessResponse
} from "@/lib/services/api-response";
import {
  candidateProfileSchema,
  generatedCoverLetterSchema,
  jobAnalysisSchema,
  jobTargetSchema,
  jobToneSchema
} from "@/lib/validation/schemas";
import type { ApiResponse, GenerateCoverLetterRequest } from "@/types/api";
import type { GeneratedCoverLetter } from "@/types/documents";
import type { JobAnalysis, JobTarget } from "@/types/job";
import type { CandidateProfile } from "@/types/profile";

const generateCoverLetterRequestSchema = z.object({
  candidateProfile: candidateProfileSchema,
  jobTarget: jobTargetSchema,
  jobAnalysis: jobAnalysisSchema,
  options: z.object({
    language: z.enum(["de", "en"]),
    tone: jobToneSchema
  })
});

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
  coverLetter.body.length <= 4 &&
  countWords(collectLetterText(coverLetter)) <= 450;

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
  const letterText = normalizeFact(collectLetterText(coverLetter));

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

export const generateCoverLetter = async (
  input: unknown
): Promise<ApiResponse<GeneratedCoverLetter>> => {
  const parsedRequest = generateCoverLetterRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return createErrorResponse(
      "INVALID_INPUT",
      "Candidate profile, job target, job analysis and cover letter options are required"
    );
  }

  const request: GenerateCoverLetterRequest = parsedRequest.data;

  if (!hasCandidateFacts(request.candidateProfile)) {
    return createErrorResponse(
      "BUSINESS_RULE_FAILED",
      "Candidate profile must contain usable facts"
    );
  }

  const prompt = buildGenerateCoverLetterPrompt(request);

  try {
    const aiCoverLetter = await generateOllamaJson<unknown>(prompt);
    const parsedCoverLetter =
      generatedCoverLetterSchema.safeParse(aiCoverLetter);

    if (!parsedCoverLetter.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the generated cover letter schema"
      );
    }

    if (!usesTargetCompanyAndRole(parsedCoverLetter.data, request.jobTarget)) {
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
        request.candidateProfile,
        request.jobAnalysis
      ) ||
      mentionsUnknownCompany(
        parsedCoverLetter.data,
        request.candidateProfile,
        request.jobTarget
      )
    ) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        "Generated cover letter contains facts not present in the candidate profile"
      );
    }

    return createSuccessResponse(parsedCoverLetter.data);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
