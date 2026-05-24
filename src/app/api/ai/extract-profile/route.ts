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
  language: z.enum(["de", "en"])
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
    const aiProfile = await generateOllamaJson<unknown>(prompt);
    const parsedProfile = candidateProfileSchema.safeParse(aiProfile);

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
