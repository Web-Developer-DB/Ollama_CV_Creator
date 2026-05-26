import { z } from "zod";
import { getAiConfig } from "@/config/ai-config";
import type { ApiErrorCode, ApiResponse } from "@/types/api";

const modelControlRequestSchema = z.object({
  action: z.enum(["load", "unload"]),
  model: z.string().trim().min(1)
});

type ModelControlResponse = {
  action: "load" | "unload";
  model: string;
};

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

const createJsonResponse = <T>(
  payload: ApiResponse<T>,
  status: number
): Response => Response.json(payload, { status });

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

  const parsedRequest = modelControlRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return createErrorResponse("INVALID_INPUT", "Action and model are required");
  }

  const config = getAiConfig();
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const timeoutController = createTimeoutController(config.timeoutMs);
  const { action, model } = parsedRequest.data;

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

    return createJsonResponse<ModelControlResponse>(
      {
        success: true,
        data: {
          action,
          model
        }
      },
      200
    );
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
}
