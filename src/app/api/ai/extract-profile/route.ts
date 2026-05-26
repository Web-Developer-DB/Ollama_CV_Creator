import { z } from "zod";
import { buildExtractProfilePrompt } from "@/lib/ai/prompts/extract-profile";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import { candidateProfileSchema } from "@/lib/validation/schemas";
import type { ApiErrorCode, ApiResponse } from "@/types/api";
import type { CandidateProfile } from "@/types/profile";

const extractProfileRequestSchema = z.object({
  text: z.string().trim().min(1),
  language: z.enum(["de", "en"]),
  model: z.string().trim().min(1).optional()
});

const errorStatusByCode: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  OLLAMA_UNAVAILABLE: 503,
  AI_MODEL_NOT_READY: 409,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const removeNullValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== "")
      .map((item) => removeNullValues(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nestedValue]) =>
      nestedValue === null || nestedValue === ""
        ? []
        : [[key, removeNullValues(nestedValue)]]
    )
  );
};

const splitTextList = (value: string): string[] =>
  value
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const readStringArray = (value: unknown): string[] => {
  if (typeof value === "string") {
    return splitTextList(value);
  }

  return Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === "string" ? splitTextList(item) : []
      )
    : [];
};

const readRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const withGeneratedId = (
  value: Record<string, unknown>,
  prefix: string,
  index: number
): Record<string, unknown> => ({
  ...value,
  id: typeof value.id === "string" && value.id ? value.id : `${prefix}-${index + 1}`
});

const normalizeCandidateProfile = (value: unknown): unknown => {
  const normalizedValue = removeNullValues(value);

  if (!isRecord(normalizedValue)) {
    return normalizedValue;
  }

  const skills = isRecord(normalizedValue.skills) ? normalizedValue.skills : {};
  const extractionMeta = isRecord(normalizedValue.extractionMeta)
    ? {
        ...normalizedValue.extractionMeta,
        uncertainFields: readStringArray(
          normalizedValue.extractionMeta.uncertainFields
        )
      }
    : undefined;

  return {
    ...normalizedValue,
    personalInfo: isRecord(normalizedValue.personalInfo)
      ? normalizedValue.personalInfo
      : {},
    experiences: readRecordArray(normalizedValue.experiences).map(
      (experience, index) => ({
        ...withGeneratedId(experience, "experience", index),
        responsibilities: readStringArray(experience.responsibilities),
        achievements: readStringArray(experience.achievements),
        technologies: readStringArray(experience.technologies)
      })
    ),
    education: readRecordArray(normalizedValue.education).map(
      (education, index) => ({
        ...withGeneratedId(education, "education", index),
        details: readStringArray(education.details)
      })
    ),
    skills: {
      technical: readStringArray(skills.technical),
      soft: readStringArray(skills.soft),
      tools: readStringArray(skills.tools),
      languages: readStringArray(skills.languages),
      methods: readStringArray(skills.methods)
    },
    projects: readRecordArray(normalizedValue.projects).map((project, index) => ({
      ...withGeneratedId(project, "project", index),
      highlights: readStringArray(project.highlights),
      technologies: readStringArray(project.technologies)
    })),
    languages: readRecordArray(normalizedValue.languages).map((language, index) =>
      withGeneratedId(language, "language", index)
    ),
    certificates: readRecordArray(normalizedValue.certificates).map(
      (certificate, index) => withGeneratedId(certificate, "certificate", index)
    ),
    ...(extractionMeta ? { extractionMeta } : {})
  };
};

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_INPUT", "Request body must be JSON");
  }

  const parsedRequest = extractProfileRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return createErrorResponse("INVALID_INPUT", "Text and language are required");
  }

  const prompt = buildExtractProfilePrompt(parsedRequest.data);

  try {
    const aiProfile = parsedRequest.data.model
      ? await generateOllamaJson<unknown>(prompt, {
          model: parsedRequest.data.model
        })
      : await generateOllamaJson<unknown>(prompt);
    const parsedProfile = candidateProfileSchema.safeParse(
      normalizeCandidateProfile(aiProfile)
    );

    if (!parsedProfile.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the candidate profile schema"
      );
    }

    return createJsonResponse<CandidateProfile>(
      {
        success: true,
        data: parsedProfile.data
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
