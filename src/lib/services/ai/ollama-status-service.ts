import { getAiConfig } from "@/config/ai-config";
import {
  createOllamaGetHeaders,
  isOllamaCloudHost
} from "@/lib/ai/ollama-http";
import { createSuccessResponse } from "@/lib/services/api-response";
import type {
  ApiResponse,
  OllamaLoadedModelStatus,
  OllamaModelStatus,
  OllamaStatus
} from "@/types/api";

type OllamaTagsResponse = {
  models?: unknown;
};

type OllamaPsResponse = {
  models?: unknown;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const normalizeModel = (value: unknown): OllamaModelStatus | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = readString(value.name) ?? readString(value.model);
  if (!name) {
    return undefined;
  }

  const details = isRecord(value.details) ? value.details : {};

  return {
    name,
    size: readNumber(value.size),
    digest: readString(value.digest),
    modifiedAt: readString(value.modified_at),
    parameterSize: readString(details.parameter_size),
    quantizationLevel: readString(details.quantization_level),
    loaded: false
  };
};

const normalizeLoadedModel = (
  value: unknown
): OllamaLoadedModelStatus | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = readString(value.name) ?? readString(value.model);
  if (!name) {
    return undefined;
  }

  const details = isRecord(value.details) ? value.details : {};

  return {
    name,
    size: readNumber(value.size),
    sizeVram: readNumber(value.size_vram),
    digest: readString(value.digest),
    expiresAt: readString(value.expires_at),
    parameterSize: readString(details.parameter_size),
    quantizationLevel: readString(details.quantization_level)
  };
};

const createUnavailableStatus = (
  baseStatus: Omit<OllamaStatus, "error">,
  error: string
): ApiResponse<OllamaStatus> =>
  createSuccessResponse({
    ...baseStatus,
    reachable: false,
    selectedModelAvailable: false,
    selectedModelLoaded: false,
    models: [],
    loadedModels: [],
    error
  });

const readOllamaError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as unknown;

    if (isRecord(payload) && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Fall through to HTTP status text.
  }

  return `Ollama returned HTTP ${response.status}`;
};

export const getOllamaStatus = async (
  options: { model?: string } = {}
): Promise<ApiResponse<OllamaStatus>> => {
  const runtimeConfig = getAiConfig();
  const requestedModel =
    options.model?.trim() || runtimeConfig.model?.trim() || undefined;
  const hasExplicitModel = Boolean(options.model?.trim());
  const config = {
    ...runtimeConfig,
    model: requestedModel
  };
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const isCloudHost = isOllamaCloudHost(baseUrl);
  const baseStatus: Omit<OllamaStatus, "error"> = {
    baseUrl,
    configuredModel: config.model ?? "",
    reachable: false,
    selectedModelAvailable: false,
    selectedModelLoaded: false,
    checkedAt: new Date().toISOString(),
    models: [],
    loadedModels: []
  };
  const timeoutController = createTimeoutController(config.timeoutMs);

  try {
    const tagsResponse = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      cache: "no-store",
      headers: createOllamaGetHeaders(config),
      signal: timeoutController.signal
    });

    if (!tagsResponse.ok) {
      const errorMessage = await readOllamaError(tagsResponse);

      return createUnavailableStatus(
        baseStatus,
        errorMessage
      );
    }

    const tagsBody = (await tagsResponse.json()) as OllamaTagsResponse;
    const rawModels =
      isRecord(tagsBody) && Array.isArray(tagsBody.models) ? tagsBody.models : [];
    const installedModels = rawModels.flatMap((model) => {
      const normalizedModel = normalizeModel(model);

      return normalizedModel ? [normalizedModel] : [];
    });
    const requestedModelAvailable = requestedModel
      ? installedModels.some((model) => model.name === requestedModel)
      : false;

    if (isCloudHost) {
      const resolvedModel =
        hasExplicitModel || requestedModel
          ? (requestedModel ?? "")
          : (installedModels[0]?.name ?? "");
      const cloudModels = installedModels.map((model) => ({
        ...model,
        loaded: model.name === resolvedModel
      }));

      return createSuccessResponse({
        ...baseStatus,
        configuredModel: resolvedModel,
        reachable: true,
        selectedModelAvailable:
          Boolean(resolvedModel) &&
          installedModels.some((model) => model.name === resolvedModel),
        selectedModelLoaded:
          Boolean(resolvedModel) &&
          installedModels.some((model) => model.name === resolvedModel),
        models: cloudModels,
        loadedModels: resolvedModel
          ? [
              {
                name: resolvedModel
              }
            ]
          : []
      });
    }

    const psResponse = await fetch(`${baseUrl}/api/ps`, {
      method: "GET",
      cache: "no-store",
      headers: createOllamaGetHeaders(config),
      signal: timeoutController.signal
    });

    if (!psResponse.ok) {
      const errorMessage = await readOllamaError(psResponse);

      return createSuccessResponse({
        ...baseStatus,
        reachable: true,
        selectedModelAvailable: requestedModelAvailable,
        error: errorMessage,
        models: installedModels
      });
    }

    const psBody = (await psResponse.json()) as OllamaPsResponse;
    const rawLoadedModels =
      isRecord(psBody) && Array.isArray(psBody.models) ? psBody.models : [];
    const loadedModels = rawLoadedModels.flatMap((model) => {
      const normalizedModel = normalizeLoadedModel(model);

      return normalizedModel ? [normalizedModel] : [];
    });
    const loadedModelNames = new Set(loadedModels.map((model) => model.name));
    const models = installedModels.map((model) => ({
      ...model,
      loaded: loadedModelNames.has(model.name)
    }));
    const resolvedModel =
      hasExplicitModel || requestedModel
        ? (requestedModel ?? "")
        : (loadedModels.find((model) =>
            installedModels.some(
              (installedModel) => installedModel.name === model.name
            )
          )?.name ??
          loadedModels[0]?.name ??
          installedModels[0]?.name ??
          "");
    const selectedModelAvailable =
      Boolean(resolvedModel) &&
      (installedModels.some((model) => model.name === resolvedModel) ||
        loadedModelNames.has(resolvedModel));

    return createSuccessResponse({
      ...baseStatus,
      configuredModel: resolvedModel,
      reachable: true,
      selectedModelAvailable,
      selectedModelLoaded:
        Boolean(resolvedModel) && loadedModelNames.has(resolvedModel),
      models,
      loadedModels
    });
  } catch {
    return createUnavailableStatus(baseStatus, "Ollama is unavailable");
  } finally {
    timeoutController.cancel();
  }
};
