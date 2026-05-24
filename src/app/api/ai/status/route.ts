import { getAiConfig } from "@/config/ai-config";
import type { ApiResponse } from "@/types/api";

type OllamaTagsResponse = {
  models?: unknown;
};

type OllamaModelStatus = {
  name: string;
  size?: number;
  digest?: string;
  modifiedAt?: string;
  parameterSize?: string;
  quantizationLevel?: string;
};

type OllamaStatus = {
  baseUrl: string;
  configuredModel: string;
  reachable: boolean;
  selectedModelAvailable: boolean;
  checkedAt: string;
  models: OllamaModelStatus[];
  error?: string;
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
    quantizationLevel: readString(details.quantization_level)
  };
};

const createStatusResponse = (data: OllamaStatus): Response =>
  Response.json(
    {
      success: true,
      data
    } satisfies ApiResponse<OllamaStatus>,
    { status: 200 }
  );

const createUnavailableStatus = (
  baseStatus: Omit<OllamaStatus, "error">,
  error: string
): Response =>
  createStatusResponse({
    ...baseStatus,
    reachable: false,
    selectedModelAvailable: false,
    models: [],
    error
  });

export async function GET(): Promise<Response> {
  const config = getAiConfig();
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const baseStatus: Omit<OllamaStatus, "error"> = {
    baseUrl,
    configuredModel: config.model,
    reachable: false,
    selectedModelAvailable: false,
    checkedAt: new Date().toISOString(),
    models: []
  };
  const timeoutController = createTimeoutController(config.timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal
    });

    if (!response.ok) {
      return createUnavailableStatus(
        baseStatus,
        `Ollama returned HTTP ${response.status}`
      );
    }

    const body = (await response.json()) as OllamaTagsResponse;
    const rawModels = isRecord(body) && Array.isArray(body.models)
      ? body.models
      : [];
    const models = rawModels.flatMap((model) => {
      const normalizedModel = normalizeModel(model);

      return normalizedModel ? [normalizedModel] : [];
    });

    return createStatusResponse({
      ...baseStatus,
      reachable: true,
      selectedModelAvailable: models.some(
        (model) => model.name === config.model
      ),
      models
    });
  } catch {
    return createUnavailableStatus(baseStatus, "Ollama is unavailable");
  } finally {
    timeoutController.cancel();
  }
}
