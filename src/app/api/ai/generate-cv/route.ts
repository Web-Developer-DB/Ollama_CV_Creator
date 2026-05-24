import { z } from "zod";
import { buildGenerateCVPrompt } from "@/lib/ai/prompts/generate-cv";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  candidateProfileSchema,
  generatedCVSchema,
  jobAnalysisSchema,
  jobTargetSchema,
  templateStyleSchema
} from "@/lib/validation/schemas";
import type { ApiErrorCode, ApiResponse } from "@/types/api";
import type { GeneratedCV, DocumentSectionItem } from "@/types/documents";
import type { CandidateProfile, WorkExperience } from "@/types/profile";

const generateCVRequestSchema = z.object({
  candidateProfile: candidateProfileSchema,
  jobTarget: jobTargetSchema,
  jobAnalysis: jobAnalysisSchema,
  options: z.object({
    language: z.enum(["de", "en"]),
    length: z.literal("one_page"),
    style: templateStyleSchema
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

const normalizeFact = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();

const compactFacts = (values: Array<string | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .filter((value): value is string => hasText(value))
        .map(normalizeFact)
        .filter(Boolean)
    )
  );

const includesKnownFact = (value: string, knownFacts: string[]): boolean => {
  const normalizedValue = normalizeFact(value);

  return knownFacts.some(
    (knownFact) =>
      normalizedValue === knownFact ||
      normalizedValue.includes(knownFact) ||
      knownFact.includes(normalizedValue)
  );
};

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

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_INPUT", "Request body must be JSON");
  }

  const parsedRequest = generateCVRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return createErrorResponse(
      "INVALID_INPUT",
      "Candidate profile, job target, job analysis and CV options are required"
    );
  }

  if (!hasCandidateFacts(parsedRequest.data.candidateProfile)) {
    return createErrorResponse(
      "BUSINESS_RULE_FAILED",
      "Candidate profile must contain usable facts"
    );
  }

  const prompt = buildGenerateCVPrompt(parsedRequest.data);

  try {
    const aiCV = await generateOllamaJson<unknown>(prompt);
    const parsedCV = generatedCVSchema.safeParse(aiCV);

    if (!parsedCV.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the generated CV schema"
      );
    }

    if (hasUnknownEmployer(parsedCV.data, parsedRequest.data.candidateProfile)) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        "Generated CV contains an employer not present in the candidate profile"
      );
    }

    if (hasUnknownSkill(parsedCV.data, parsedRequest.data.candidateProfile)) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        "Generated CV contains a skill not present in the candidate profile"
      );
    }

    return createJsonResponse<GeneratedCV>(
      {
        success: true,
        data: parsedCV.data
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
