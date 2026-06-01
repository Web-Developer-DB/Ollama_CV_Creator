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
import type {
  AiRuntimeOptions,
  AnalyzeJobRequest,
  ApiResponse
} from "@/types/api";
import type { JobAnalysis } from "@/types/job";

const runtimeOptionsSchema = z
  .object({
    contextWindow: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional()
  })
  .optional();

const analyzeJobRequestSchema = z.object({
  jobDescription: z.string().trim().min(1),
  language: z.enum(["de", "en"]),
  model: z.string().trim().min(1).optional(),
  runtime: runtimeOptionsSchema
});

const createOllamaOptions = (
  model: string | undefined,
  runtime: AiRuntimeOptions | undefined
) => ({
  ...(model ? { model } : {}),
  ...(runtime?.timeoutMs ? { timeoutMs: runtime.timeoutMs } : {})
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
  const prompt = {
    ...buildAnalyzeJobPrompt(request),
    ...(request.runtime?.contextWindow
      ? { numCtx: request.runtime.contextWindow }
      : {})
  };

  try {
    const aiAnalysis = await generateOllamaJson<unknown>(
      prompt,
      createOllamaOptions(request.model, request.runtime)
    );
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
