import { z } from "zod";
import { getAiConfig } from "@/config/ai-config";
import {
  createErrorResponse,
  createSuccessResponse
} from "@/lib/services/api-response";
import type {
  ApiResponse,
  ModelControlRequest,
  ModelControlResponse
} from "@/types/api";

const modelControlRequestSchema = z.object({
  action: z.enum(["load", "unload"]),
  model: z.string().trim().min(1)
});

const createTimeoutController = (
  timeoutMs: number
): { signal: AbortSignal; cancel: () => void } => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeout)
  };
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";

export const controlOllamaModel = async (
  input: unknown
): Promise<ApiResponse<ModelControlResponse>> => {
  const parsedRequest = modelControlRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return createErrorResponse("INVALID_INPUT", "Action and model are required");
  }

  const config = getAiConfig();
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const timeoutController = createTimeoutController(config.timeoutMs);
  const { action, model }: ModelControlRequest = parsedRequest.data;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: "",
        stream: false,
        keep_alive: action === "load" ? -1 : 0
      }),
      signal: timeoutController.signal
    });

    if (!response.ok) {
      return createErrorResponse(
        "OLLAMA_UNAVAILABLE",
        `Ollama returned HTTP ${response.status} while trying to ${action} ${model}`
      );
    }

    return createSuccessResponse({
      action,
      model
    });
  } catch (error) {
    return createErrorResponse(
      isAbortError(error) ? "AI_TIMEOUT" : "OLLAMA_UNAVAILABLE",
      isAbortError(error)
        ? `Timed out while trying to ${action} ${model}`
        : `Could not ${action} ${model}`
    );
  } finally {
    timeoutController.cancel();
  }
};
