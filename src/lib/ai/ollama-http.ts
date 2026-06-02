// HTTP helpers for Ollama hosts. Cloud authentication is attached only for the
// direct ollama.com host, never for local Ollama requests.
import type { AiConfig } from "@/config/ai-config";

export const isOllamaCloudHost = (baseUrl: string): boolean => {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();

    return hostname === "ollama.com" || hostname.endsWith(".ollama.com");
  } catch {
    return false;
  }
};

export const createOllamaHeaders = (
  config: Pick<AiConfig, "baseUrl" | "apiKey">
): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (config.apiKey && isOllamaCloudHost(config.baseUrl)) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  return headers;
};

export const createOllamaGetHeaders = (
  config: Pick<AiConfig, "baseUrl" | "apiKey">
): Record<string, string> => {
  const headers = createOllamaHeaders(config);

  delete headers["Content-Type"];

  return headers;
};
