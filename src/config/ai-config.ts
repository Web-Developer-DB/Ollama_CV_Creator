export type AiConfig = {
  baseUrl: string;
  model?: string;
  timeoutMs: number;
  apiKey?: string;
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: "http://127.0.0.1:11434",
  timeoutMs: 180_000
};

const normalizeBaseUrl = (value: string): string =>
  value.replace(/\/+$/, "").replace(/\/api$/i, "");

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
  baseUrl: normalizeBaseUrl(
    process.env.OLLAMA_BASE_URL ?? DEFAULT_AI_CONFIG.baseUrl
  ),
  timeoutMs: parseTimeout(process.env.OLLAMA_TIMEOUT_MS),
  apiKey: process.env.OLLAMA_API_KEY?.trim() || undefined
});
