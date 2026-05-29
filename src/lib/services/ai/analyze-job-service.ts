import { z } from "zod";
import { buildAnalyzeJobPrompt } from "@/lib/ai/prompts/analyze-job";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  createErrorResponse,
  createSuccessResponse
} from "@/lib/services/api-response";
import { jobAnalysisSchema } from "@/lib/validation/schemas";
import type { AnalyzeJobRequest, ApiResponse } from "@/types/api";
import type { JobAnalysis } from "@/types/job";

const analyzeJobRequestSchema = z.object({
  jobDescription: z.string().trim().min(1),
  language: z.enum(["de", "en"])
});

export const analyzeJob = async (
  input: unknown
): Promise<ApiResponse<JobAnalysis>> => {
  const parsedRequest = analyzeJobRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return createErrorResponse(
      "INVALID_INPUT",
      "Job description and language are required"
    );
  }

  const request: AnalyzeJobRequest = parsedRequest.data;
  const prompt = buildAnalyzeJobPrompt(request);

  try {
    const aiAnalysis = await generateOllamaJson<unknown>(prompt);
    const parsedAnalysis = jobAnalysisSchema.safeParse(aiAnalysis);

    if (!parsedAnalysis.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the job analysis schema"
      );
    }

    return createSuccessResponse(parsedAnalysis.data);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
