// Framework-independent service for extracting target-role guidance from a job
// description. Its output is tailoring context, not final document content.
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
import { resolveContextWindow } from "@/lib/services/ai/context-window";
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
    ...buildAnalyzeJobPrompt(request)
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
    const aiAnalysis = await generateOllamaJson<unknown>(
      runtimePrompt,
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
