import type { ApiErrorCode, ApiResponse } from "@/types/api";

export const errorStatusByCode: Record<ApiErrorCode, number> = {
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

export const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data
});

export const createErrorResponse = <T = never>(
  code: ApiErrorCode,
  message: string,
  details?: unknown
): ApiResponse<T> => ({
  success: false,
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details })
  }
});

export const getApiResponseStatus = (payload: ApiResponse<unknown>): number =>
  payload.success ? 200 : errorStatusByCode[payload.error?.code ?? "EXPORT_FAILED"];
