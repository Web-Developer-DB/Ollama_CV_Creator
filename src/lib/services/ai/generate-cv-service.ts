import { z } from "zod";
import { buildGenerateCVPrompt } from "@/lib/ai/prompts/generate-cv";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  compactFacts,
  hasCandidateFacts,
  hasText,
  includesKnownFact
} from "@/lib/services/ai/candidate-facts";
import {
  createErrorResponse,
  createSuccessResponse
} from "@/lib/services/api-response";
import {
  candidateProfileSchema,
  generatedCVSchema,
  jobAnalysisSchema,
  jobTargetSchema,
  templateStyleSchema
} from "@/lib/validation/schemas";
import type { ApiResponse, GenerateCVRequest } from "@/types/api";
import type { DocumentSectionItem, GeneratedCV } from "@/types/documents";
import type { CandidateProfile } from "@/types/profile";

const generateCVRequestSchema = z.object({
  candidateProfile: candidateProfileSchema,
  jobTarget: jobTargetSchema,
  jobAnalysis: jobAnalysisSchema,
  model: z.string().trim().min(1).optional(),
  options: z.object({
    language: z.enum(["de", "en"]),
    length: z.literal("one_page"),
    style: templateStyleSchema
  })
});

const collectKnownExperienceFacts = (
  candidateProfile: CandidateProfile
): string[] =>
  compactFacts(
    candidateProfile.experiences.flatMap((experience) => [
      experience.company,
      experience.role,
      experience.location,
      experience.startDate,
      experience.endDate
    ])
  );

const hasAlphabeticText = (value: string): boolean => /[a-z]/i.test(value);

const hasUnknownEmployer = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): boolean => {
  const knownExperienceFacts = collectKnownExperienceFacts(candidateProfile);

  return generatedCV.sections
    .filter((section) => section.type === "experience")
    .flatMap((section) => section.items)
    .some((item) => {
      if (!hasText(item.subtitle) || !hasAlphabeticText(item.subtitle ?? "")) {
        return false;
      }

      return !includesKnownFact(item.subtitle ?? "", knownExperienceFacts);
    });
};

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

const splitSkillText = (value: string): string[] =>
  value
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const collectGeneratedSkillValues = (item: DocumentSectionItem): string[] => [
  ...splitSkillText(item.body ?? ""),
  ...item.bullets.flatMap(splitSkillText)
];

const hasUnknownSkill = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): boolean => {
  const knownSkills = collectKnownSkills(candidateProfile);
  const generatedSkillValues = generatedCV.sections
    .filter((section) => section.type === "skills")
    .flatMap((section) => section.items)
    .flatMap(collectGeneratedSkillValues);

  if (generatedSkillValues.length === 0) {
    return false;
  }

  return generatedSkillValues.some(
    (skillValue) => !includesKnownFact(skillValue, knownSkills)
  );
};

export const generateCv = async (
  input: unknown
): Promise<ApiResponse<GeneratedCV>> => {
  const parsedRequest = generateCVRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return createErrorResponse(
      "INVALID_INPUT",
      "Candidate profile, job target, job analysis and CV options are required"
    );
  }

  const request: GenerateCVRequest = parsedRequest.data;

  if (!hasCandidateFacts(request.candidateProfile)) {
    return createErrorResponse(
      "BUSINESS_RULE_FAILED",
      "Candidate profile must contain usable facts"
    );
  }

  const prompt = buildGenerateCVPrompt(request);

  try {
    const aiCV = await generateOllamaJson<unknown>(
      prompt,
      request.model ? { model: request.model } : undefined
    );
    const parsedCV = generatedCVSchema.safeParse(aiCV);

    if (!parsedCV.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the generated CV schema"
      );
    }

    if (hasUnknownEmployer(parsedCV.data, request.candidateProfile)) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        "Generated CV contains an employer not present in the candidate profile"
      );
    }

    if (hasUnknownSkill(parsedCV.data, request.candidateProfile)) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        "Generated CV contains a skill not present in the candidate profile"
      );
    }

    return createSuccessResponse(parsedCV.data);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
