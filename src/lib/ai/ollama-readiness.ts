import { getAiConfig, type AiConfig } from "@/config/ai-config";
import type { ApiErrorCode } from "@/types/api";

type OllamaReadinessOptions = Partial<
  Pick<AiConfig, "baseUrl" | "model" | "timeoutMs">
>;

type OllamaReadinessErrorCode = Extract<
  ApiErrorCode,
  "OLLAMA_UNAVAILABLE" | "AI_MODEL_NOT_READY" | "AI_TIMEOUT"
>;

type OllamaReadinessBase = {
  baseUrl: string;
  model: string;
  installedModels: string[];
  loadedModels: string[];
};

export type OllamaReadiness =
  | (OllamaReadinessBase & {
      ready: true;
    })
  | (OllamaReadinessBase & {
      ready: false;
      code: OllamaReadinessErrorCode;
      message: string;
    });

type OllamaModelsResponse = {
  models?: unknown;
};

const createRuntimeConfig = (
  options: OllamaReadinessOptions = {}
): AiConfig => {
  const runtimeConfig = getAiConfig();

  return {
    ...runtimeConfig,
    ...options,
    baseUrl: (options.baseUrl ?? runtimeConfig.baseUrl).replace(/\/+$/, "")
  };
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readModelName = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = value.name ?? value.model;

  return typeof name === "string" && name.length > 0 ? name : undefined;
};

const collectModelNames = (body: OllamaModelsResponse): string[] => {
  const models = isRecord(body) && Array.isArray(body.models) ? body.models : [];

  return Array.from(
    new Set(
      models.flatMap((model) => {
        const name = readModelName(model);

        return name ? [name] : [];
      })
    )
  );
};

const createNotReady = (
  config: AiConfig,
  model: string,
  code: OllamaReadinessErrorCode,
  message: string,
  installedModels: string[] = [],
  loadedModels: string[] = []
): OllamaReadiness => ({
  ready: false,
  code,
  message,
  baseUrl: config.baseUrl,
  model,
  installedModels,
  loadedModels
});

const resolveLoadedModel = (
  requestedModel: string,
  installedModels: string[],
  loadedModels: string[]
): string | undefined => {
  if (loadedModels.includes(requestedModel)) {
    return requestedModel;
  }

  return (
    loadedModels.find((loadedModel) => installedModels.includes(loadedModel)) ??
    loadedModels[0]
  );
};

export const checkOllamaReadiness = async (
  options: OllamaReadinessOptions = {}
): Promise<OllamaReadiness> => {
  const config = createRuntimeConfig(options);
  const requestedModel = config.model;
  const timeoutController = createTimeoutController(config.timeoutMs);
  let installedModels: string[] = [];
  let loadedModels: string[] = [];

  try {
    const tagsResponse = await fetch(`${config.baseUrl}/api/tags`, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal
    });

    if (!tagsResponse.ok) {
      return createNotReady(
        config,
        requestedModel,
        "OLLAMA_UNAVAILABLE",
        `Ollama model list returned HTTP ${tagsResponse.status}. Open AI Status, verify Ollama is running, then try again.`
      );
    }

    const tagsBody = (await tagsResponse.json()) as OllamaModelsResponse;
    installedModels = collectModelNames(tagsBody);

    const psResponse = await fetch(`${config.baseUrl}/api/ps`, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal
    });

    if (!psResponse.ok) {
      return createNotReady(
        config,
        requestedModel,
        "AI_MODEL_NOT_READY",
        `Loaded model status returned HTTP ${psResponse.status}. Open AI Status and verify the selected model.`,
        installedModels
      );
    }

    const psBody = (await psResponse.json()) as OllamaModelsResponse;
    loadedModels = collectModelNames(psBody);
    const resolvedModel = resolveLoadedModel(
      requestedModel,
      installedModels,
      loadedModels
    );

    if (resolvedModel) {
      return {
        ready: true,
        baseUrl: config.baseUrl,
        model: resolvedModel,
        installedModels,
        loadedModels
      };
    }

    if (!installedModels.includes(requestedModel)) {
      return createNotReady(
        config,
        requestedModel,
        "AI_MODEL_NOT_READY",
        `Ollama model ${requestedModel} is not installed and no other model is loaded. Open AI Status, install or load an available model, then try again.`,
        installedModels,
        loadedModels
      );
    }

    if (!loadedModels.includes(requestedModel)) {
      return createNotReady(
        config,
        requestedModel,
        "AI_MODEL_NOT_READY",
        `Ollama model ${requestedModel} is installed but not loaded. Open AI Status, load the model in Ollama, then try again.`,
        installedModels,
        loadedModels
      );
    }

    return createNotReady(
      config,
      requestedModel,
      "AI_MODEL_NOT_READY",
      "No Ollama model is loaded. Open AI Status, load a model, then try again.",
      installedModels,
      loadedModels
    );
  } catch (error) {
    return createNotReady(
      config,
      requestedModel,
      isAbortError(error) ? "AI_TIMEOUT" : "OLLAMA_UNAVAILABLE",
      isAbortError(error)
        ? "Ollama readiness check timed out. Open AI Status, verify Ollama and the selected model, then try again."
        : "Ollama is unavailable. Open AI Status, start Ollama, then try again.",
      installedModels,
      loadedModels
    );
  } finally {
    timeoutController.cancel();
  }
};
