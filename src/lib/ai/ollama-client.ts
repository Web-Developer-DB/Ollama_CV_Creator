import { getAiConfig, type AiConfig } from "@/config/ai-config";
import { checkOllamaReadiness } from "@/lib/ai/ollama-readiness";
import type { ApiErrorCode } from "@/types/api";

type OllamaGenerateRequest = {
  prompt: string;
  system: string;
  model?: string;
  temperature?: number;
  think?: boolean;
  numCtx?: number;
  numPredict?: number;
  format?: "json";
};

type OllamaGenerateResponse = {
  response?: unknown;
  thinking?: unknown;
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
): string => {
  const options = {
    temperature: request.temperature,
    num_ctx: request.numCtx,
    num_predict: request.numPredict
  };
  const hasOptions = Object.values(options).some(
    (value) => value !== undefined
  );

  return JSON.stringify({
    model: request.model ?? config.model,
    prompt: request.prompt,
    system: request.system,
    stream: false,
    format: request.format,
    think: request.think,
    options: hasOptions ? options : undefined
  });
};

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
  const readiness = await checkOllamaReadiness({
    ...config,
    model: request.model ?? config.model
  });

  if (!readiness.ready) {
    throw new OllamaClientError(readiness.code, readiness.message);
  }

  let response: Response;
  const timeoutController = createTimeoutController(config.timeoutMs);
  try {
    response = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: createRequestBody({ ...request, model: readiness.model }, config),
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

  if (typeof response.response === "string" && response.response.trim()) {
    return response.response;
  }

  if (typeof response.thinking === "string" && response.thinking.trim()) {
    return response.thinking;
  }

  if (typeof response.response !== "string") {
    throw new OllamaClientError(
      "INVALID_AI_JSON",
      "Ollama response text is invalid"
    );
  }

  throw new OllamaClientError(
    "INVALID_AI_JSON",
    "Ollama response text is empty"
  );
};

const stripJsonFences = (value: string): string =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const normalizeGeneratedJsonText = (value: string): string =>
  stripJsonFences(value.replace(/<think>[\s\S]*?<\/think>/gi, ""));

const findBalancedJsonCandidate = (
  value: string,
  startIndex: number
): string | undefined => {
  const matchingBrace: Record<string, string> = {
    "{": "}",
    "[": "]"
  };
  const stack: string[] = [];
  let isInsideString = false;
  let isEscaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const character = value[index];

    if (isInsideString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === "\"") {
        isInsideString = false;
      }

      continue;
    }

    if (character === "\"") {
      isInsideString = true;
      continue;
    }

    if (character === "{" || character === "[") {
      stack.push(matchingBrace[character]);
      continue;
    }

    if (character === "}" || character === "]") {
      if (stack.at(-1) !== character) {
        return undefined;
      }

      stack.pop();

      if (stack.length === 0) {
        return value.slice(startIndex, index + 1);
      }
    }
  }

  return undefined;
};

const collectJsonCandidates = (value: string): string[] => {
  const candidates = [value];

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character !== "{" && character !== "[") {
      continue;
    }

    const candidate = findBalancedJsonCandidate(value, index);
    if (candidate && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
};

const parseGeneratedJson = <T>(value: string): T => {
  const normalizedValue = normalizeGeneratedJsonText(value);

  for (const candidate of collectJsonCandidates(normalizedValue)) {
    try {
      return JSON.parse(stripJsonFences(candidate)) as T;
    } catch {
      // Try the next balanced JSON candidate before failing the AI response.
    }
  }

  throw new OllamaClientError(
    "INVALID_AI_JSON",
    "Ollama generated invalid JSON"
  );
};

export const generateOllamaJson = async <T>(
  request: OllamaGenerateRequest,
  options?: OllamaClientOptions
): Promise<T> => {
  const text = await generateOllamaText(
    {
      ...request,
      think: request.think ?? false,
      format: "json"
    },
    options
  );

  return parseGeneratedJson<T>(text);
};
