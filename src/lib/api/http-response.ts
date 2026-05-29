import {
  createErrorResponse,
  getApiResponseStatus
} from "@/lib/services/api-response";
import type { ApiResponse } from "@/types/api";

export const createHttpJsonResponse = <T>(payload: ApiResponse<T>): Response =>
  Response.json(payload, {
    status: getApiResponseStatus(payload)
  });

export const readJsonRequestBody = async (
  request: Request
): Promise<ApiResponse<unknown>> => {
  try {
    return {
      success: true,
      data: await request.json()
    };
  } catch {
    return createErrorResponse("INVALID_INPUT", "Request body must be JSON");
  }
};
