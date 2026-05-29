import type {
  AnalyzeJobRequest,
  AnalyzeJobResponse,
  ApiResponse,
  ExtractProfileRequest,
  ExtractProfileResponse,
  GenerateCoverLetterRequest,
  GenerateCoverLetterResponse,
  GenerateCVRequest,
  GenerateCVResponse,
  ModelControlRequest,
  ModelControlResponse,
  OllamaStatus
} from "@/types/api";

const desktopApi = () =>
  typeof window === "undefined" ? undefined : window.desktopApi;

const readJsonResponse = async <T>(response: Response): Promise<ApiResponse<T>> =>
  response.json() as Promise<ApiResponse<T>>;

const postJson = async <T>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> => {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return readJsonResponse<T>(response);
};

export const getAiStatus = async (
  model?: string
): Promise<ApiResponse<OllamaStatus>> => {
  const api = desktopApi();

  if (api?.ai) {
    return api.ai.status(model ? { model } : undefined);
  }

  const statusUrl = model
    ? `/api/ai/status?model=${encodeURIComponent(model)}`
    : "/api/ai/status";
  const response = await fetch(statusUrl, {
    cache: "no-store"
  });

  return readJsonResponse<OllamaStatus>(response);
};

export const controlAiModel = async (
  request: ModelControlRequest
): Promise<ApiResponse<ModelControlResponse>> => {
  const api = desktopApi();

  return api?.ai
    ? api.ai.modelControl(request)
    : postJson<ModelControlResponse>("/api/ai/model-control", request);
};

export const extractProfile = async (
  request: ExtractProfileRequest
): Promise<ExtractProfileResponse> => {
  const api = desktopApi();

  return api?.ai
    ? api.ai.extractProfile(request)
    : postJson("/api/ai/extract-profile", request);
};

export const analyzeJob = async (
  request: AnalyzeJobRequest
): Promise<AnalyzeJobResponse> => {
  const api = desktopApi();

  return api?.ai
    ? api.ai.analyzeJob(request)
    : postJson("/api/ai/analyze-job", request);
};

export const generateCv = async (
  request: GenerateCVRequest
): Promise<GenerateCVResponse> => {
  const api = desktopApi();

  return api?.ai
    ? api.ai.generateCv(request)
    : postJson("/api/ai/generate-cv", request);
};

export const generateCoverLetter = async (
  request: GenerateCoverLetterRequest
): Promise<GenerateCoverLetterResponse> => {
  const api = desktopApi();

  return api?.ai
    ? api.ai.generateCoverLetter(request)
    : postJson("/api/ai/generate-cover-letter", request);
};
