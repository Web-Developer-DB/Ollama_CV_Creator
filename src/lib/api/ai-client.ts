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
import { readStoredModel } from "@/lib/ai/selected-model";

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
  const selectedModel = model?.trim() || readStoredModel();

  if (api?.ai) {
    return api.ai.status(selectedModel ? { model: selectedModel } : undefined);
  }

  const statusUrl = selectedModel
    ? `/api/ai/status?model=${encodeURIComponent(selectedModel)}`
    : "/api/ai/status";
  const response = await fetch(statusUrl, {
    cache: "no-store"
  });

  return readJsonResponse<OllamaStatus>(response);
};

const withSelectedModel = <TRequest extends { model?: string }>(
  request: TRequest
): TRequest => {
  const selectedModel = request.model?.trim() || readStoredModel();

  return selectedModel ? { ...request, model: selectedModel } : request;
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
  const requestWithModel = withSelectedModel(request);

  return api?.ai
    ? api.ai.extractProfile(requestWithModel)
    : postJson("/api/ai/extract-profile", requestWithModel);
};

export const analyzeJob = async (
  request: AnalyzeJobRequest
): Promise<AnalyzeJobResponse> => {
  const api = desktopApi();
  const requestWithModel = withSelectedModel(request);

  return api?.ai
    ? api.ai.analyzeJob(requestWithModel)
    : postJson("/api/ai/analyze-job", requestWithModel);
};

export const generateCv = async (
  request: GenerateCVRequest
): Promise<GenerateCVResponse> => {
  const api = desktopApi();
  const requestWithModel = withSelectedModel(request);

  return api?.ai
    ? api.ai.generateCv(requestWithModel)
    : postJson("/api/ai/generate-cv", requestWithModel);
};

export const generateCoverLetter = async (
  request: GenerateCoverLetterRequest
): Promise<GenerateCoverLetterResponse> => {
  const api = desktopApi();
  const requestWithModel = withSelectedModel(request);

  return api?.ai
    ? api.ai.generateCoverLetter(requestWithModel)
    : postJson("/api/ai/generate-cover-letter", requestWithModel);
};
