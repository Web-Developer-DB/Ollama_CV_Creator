import { getAiConfig } from "@/config/ai-config";
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

export const getOllamaStatus = async (
  options: { model?: string } = {}
): Promise<ApiResponse<OllamaStatus>> => {
  const runtimeConfig = getAiConfig();
  const requestedModel = options.model?.trim() || runtimeConfig.model;
  const hasExplicitModel = Boolean(options.model?.trim());
  const config = {
    ...runtimeConfig,
    model: requestedModel
  };
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const baseStatus: Omit<OllamaStatus, "error"> = {
    baseUrl,
    configuredModel: config.model,
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
      signal: timeoutController.signal
    });

    if (!tagsResponse.ok) {
      return createUnavailableStatus(
        baseStatus,
        `Ollama returned HTTP ${tagsResponse.status}`
      );
    }

    const tagsBody = (await tagsResponse.json()) as OllamaTagsResponse;
    const rawModels =
      isRecord(tagsBody) && Array.isArray(tagsBody.models) ? tagsBody.models : [];
    const installedModels = rawModels.flatMap((model) => {
      const normalizedModel = normalizeModel(model);

      return normalizedModel ? [normalizedModel] : [];
    });
    const requestedModelAvailable = installedModels.some(
      (model) => model.name === config.model
    );

    const psResponse = await fetch(`${baseUrl}/api/ps`, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal
    });

    if (!psResponse.ok) {
      return createSuccessResponse({
        ...baseStatus,
        reachable: true,
        selectedModelAvailable: requestedModelAvailable,
        error: `Ollama loaded model status returned HTTP ${psResponse.status}`,
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
      hasExplicitModel || loadedModels.length === 0
        ? requestedModel
        : (loadedModels.find((model) =>
            installedModels.some(
              (installedModel) => installedModel.name === model.name
            )
          )?.name ?? loadedModels[0]?.name ?? requestedModel);
    const selectedModelAvailable =
      installedModels.some((model) => model.name === resolvedModel) ||
      loadedModelNames.has(resolvedModel);

    return createSuccessResponse({
      ...baseStatus,
      configuredModel: resolvedModel,
      reachable: true,
      selectedModelAvailable,
      selectedModelLoaded: loadedModelNames.has(resolvedModel),
      models,
      loadedModels
    });
  } catch {
    return createUnavailableStatus(baseStatus, "Ollama is unavailable");
  } finally {
    timeoutController.cancel();
  }
};
