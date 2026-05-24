export type AiConfig = {
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: "http://127.0.0.1:11434",
  model: "qwen3.5:4b",
  timeoutMs: 60_000
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const parseTimeout = (value: string | undefined): number => {
  const parsedValue = Number.parseInt(
    value ?? String(DEFAULT_AI_CONFIG.timeoutMs),
    10
  );

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_AI_CONFIG.timeoutMs;
};

export const getAiConfig = (): AiConfig => ({
  baseUrl: trimTrailingSlash(
    process.env.OLLAMA_BASE_URL ?? DEFAULT_AI_CONFIG.baseUrl
  ),
  model: process.env.OLLAMA_MODEL ?? DEFAULT_AI_CONFIG.model,
  timeoutMs: parseTimeout(process.env.OLLAMA_TIMEOUT_MS)
});
