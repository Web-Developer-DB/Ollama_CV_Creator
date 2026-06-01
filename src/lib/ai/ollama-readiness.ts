import { getAiConfig, type AiConfig } from "@/config/ai-config";
import {
  createOllamaGetHeaders,
  isOllamaCloudHost
} from "@/lib/ai/ollama-http";
import type { ApiErrorCode } from "@/types/api";

type OllamaReadinessOptions = Partial<
  Pick<AiConfig, "baseUrl" | "model" | "timeoutMs" | "apiKey">
>;

type OllamaReadinessErrorCode = Extract<
  ApiErrorCode,
  "OLLAMA_UNAVAILABLE" | "AI_MODEL_NOT_READY" | "AI_TIMEOUT"
>;

type OllamaReadinessBase = {
  baseUrl: string;
  model?: string;
  installedModels: string[];
  loadedModels: string[];
};

export type OllamaReadiness =
  | (OllamaReadinessBase & {
      ready: true;
      model: string;
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
    baseUrl: (options.baseUrl ?? runtimeConfig.baseUrl)
      .replace(/\/+$/, "")
      .replace(/\/api$/i, "")
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

const createNotReady = (
  config: AiConfig,
  model: string | undefined,
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
  requestedModel: string | undefined,
  installedModels: string[],
  loadedModels: string[]
): string | undefined => {
  if (requestedModel) {
    return loadedModels.includes(requestedModel) ? requestedModel : undefined;
  }

  return (
    loadedModels.find((loadedModel) => installedModels.includes(loadedModel)) ??
    loadedModels[0]
  );
};

const describeModel = (model: string | undefined): string =>
  model ? `Ollama model ${model}` : "The selected Ollama model";

export const checkOllamaReadiness = async (
  options: OllamaReadinessOptions = {}
): Promise<OllamaReadiness> => {
  const config = createRuntimeConfig(options);
  const requestedModel = config.model?.trim() || undefined;
  const isCloudHost = isOllamaCloudHost(config.baseUrl);
  const timeoutController = createTimeoutController(config.timeoutMs);
  let installedModels: string[] = [];
  let loadedModels: string[] = [];

  try {
    const tagsResponse = await fetch(`${config.baseUrl}/api/tags`, {
      method: "GET",
      cache: "no-store",
      headers: createOllamaGetHeaders(config),
      signal: timeoutController.signal
    });

    if (!tagsResponse.ok) {
      const errorMessage = await readOllamaError(tagsResponse);

      return createNotReady(
        config,
        requestedModel,
        "OLLAMA_UNAVAILABLE",
        `${errorMessage}. Open AI Status, verify Ollama is running, then try again.`
      );
    }

    const tagsBody = (await tagsResponse.json()) as OllamaModelsResponse;
    installedModels = collectModelNames(tagsBody);

    if (isCloudHost) {
      const cloudModel =
        requestedModel ??
        installedModels.find((model) => !model.endsWith("-cloud")) ??
        installedModels[0];

      if (cloudModel && installedModels.includes(cloudModel)) {
        return {
          ready: true,
          baseUrl: config.baseUrl,
          model: cloudModel,
          installedModels,
          loadedModels: []
        };
      }

      return createNotReady(
        config,
        requestedModel,
        "AI_MODEL_NOT_READY",
        requestedModel
          ? `${describeModel(requestedModel)} is not available on Ollama Cloud. Select a cloud model from AI Status, then try again.`
          : "No Ollama Cloud model is available. Verify OLLAMA_API_KEY and the cloud model list.",
        installedModels
      );
    }

    const psResponse = await fetch(`${config.baseUrl}/api/ps`, {
      method: "GET",
      cache: "no-store",
      headers: createOllamaGetHeaders(config),
      signal: timeoutController.signal
    });

    if (!psResponse.ok) {
      const errorMessage = await readOllamaError(psResponse);

      return createNotReady(
        config,
        requestedModel,
        "AI_MODEL_NOT_READY",
        `${errorMessage}. Open AI Status and verify the selected model.`,
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

    if (requestedModel && !installedModels.includes(requestedModel)) {
      return createNotReady(
        config,
        requestedModel,
        "AI_MODEL_NOT_READY",
        `${describeModel(requestedModel)} is not installed. Open AI Status, select an installed model, load it, then try again.`,
        installedModels,
        loadedModels
      );
    }

    if (requestedModel && !loadedModels.includes(requestedModel)) {
      return createNotReady(
        config,
        requestedModel,
        "AI_MODEL_NOT_READY",
        `${describeModel(requestedModel)} is installed but not loaded. Open AI Status, load the selected model, then try again.`,
        installedModels,
        loadedModels
      );
    }

    return createNotReady(
      config,
      requestedModel,
      "AI_MODEL_NOT_READY",
      "No Ollama model is loaded. Open AI Status, load a selected installed model, then try again.",
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
