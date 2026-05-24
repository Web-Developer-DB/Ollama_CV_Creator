import { getAiConfig, type AiConfig } from "@/config/ai-config";
import type { ApiErrorCode } from "@/types/api";

type OllamaGenerateRequest = {
  prompt: string;
  system: string;
  model?: string;
  temperature?: number;
  format?: "json";
};

type OllamaGenerateResponse = {
  response?: unknown;
  done?: unknown;
};

type OllamaClientOptions = Partial<Pick<AiConfig, "baseUrl" | "model" | "timeoutMs">>;

export class OllamaClientError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "OllamaClientError";
    this.code = code;
  }
}

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

const createRequestBody = (
  request: OllamaGenerateRequest,
  config: AiConfig
): string =>
  JSON.stringify({
    model: request.model ?? config.model,
    prompt: request.prompt,
    system: request.system,
    stream: false,
    format: request.format,
    options:
      request.temperature === undefined
        ? undefined
        : {
            temperature: request.temperature
          }
  });

const requestOllama = async (
  request: OllamaGenerateRequest,
  options: OllamaClientOptions = {}
): Promise<OllamaGenerateResponse> => {
  const runtimeConfig = getAiConfig();
  const config: AiConfig = {
    ...runtimeConfig,
    ...options,
    baseUrl: (options.baseUrl ?? runtimeConfig.baseUrl).replace(/\/+$/, "")
  };

  let response: Response;
  const timeoutController = createTimeoutController(config.timeoutMs);
  try {
    response = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: createRequestBody(request, config),
      signal: timeoutController.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new OllamaClientError("AI_TIMEOUT", "Ollama request timed out");
    }

    throw new OllamaClientError(
      "OLLAMA_UNAVAILABLE",
      "Ollama is unavailable"
    );
  } finally {
    timeoutController.cancel();
  }

  if (!response.ok) {
    throw new OllamaClientError(
      "OLLAMA_UNAVAILABLE",
      "Ollama returned an error"
    );
  }

  let parsedResponse: unknown;
  try {
    parsedResponse = await response.json();
  } catch {
    throw new OllamaClientError(
      "INVALID_AI_JSON",
      "Ollama returned invalid JSON"
    );
  }

  if (
    typeof parsedResponse !== "object" ||
    parsedResponse === null ||
    !("response" in parsedResponse)
  ) {
    throw new OllamaClientError(
      "INVALID_AI_JSON",
      "Ollama response is missing generated text"
    );
  }

  return parsedResponse as OllamaGenerateResponse;
};

export const generateOllamaText = async (
  request: OllamaGenerateRequest,
  options?: OllamaClientOptions
): Promise<string> => {
  const response = await requestOllama(request, options);

  if (typeof response.response !== "string") {
    throw new OllamaClientError(
      "INVALID_AI_JSON",
      "Ollama response text is invalid"
    );
  }

  return response.response;
};

export const generateOllamaJson = async <T>(
  request: OllamaGenerateRequest,
  options?: OllamaClientOptions
): Promise<T> => {
  const text = await generateOllamaText(
    {
      ...request,
      format: "json"
    },
    options
  );

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new OllamaClientError(
      "INVALID_AI_JSON",
      "Ollama generated invalid JSON"
    );
  }
};
