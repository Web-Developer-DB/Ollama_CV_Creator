// Central browser-local LLM settings. This is the single renderer-side source
// for the selected model, model kind, context window, and timeout used by all
// AI requests.
import type { AiRuntimeOptions } from "@/types/api";
import { isOllamaCloudHost } from "@/lib/ai/ollama-http";
import {
  defaultRuntimeSettings,
  readStoredRuntimeSettings,
  runtimeSettingsStorageKey
} from "@/lib/ai/runtime-settings";
import {
  readStoredModel,
  selectedModelStorageKey
} from "@/lib/ai/selected-model";

export type LlmModelKind = "local" | "cloud";

export type PersistedLlmSettings = {
  model?: string;
  modelKind: LlmModelKind;
  runtime: Required<AiRuntimeOptions>;
  updatedAt?: string;
};

type StoredLlmSettings = {
  model?: unknown;
  modelKind?: unknown;
  runtime?: unknown;
  contextWindow?: unknown;
  timeoutMs?: unknown;
  updatedAt?: unknown;
};

export const llmSettingsStorageKey = "ollama-cv-llm-settings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readPositiveInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const readModelKind = (value: unknown): LlmModelKind | undefined =>
  value === "local" || value === "cloud" ? value : undefined;

export const inferLlmModelKind = (
  model: string | undefined,
  baseUrl?: string
): LlmModelKind => {
  if (baseUrl && isOllamaCloudHost(baseUrl)) {
    return "cloud";
  }

  return model && /(?:^|[:_-])cloud(?:$|[:_-])/.test(model)
    ? "cloud"
    : "local";
};

const normalizeRuntimeSettings = (
  value: unknown,
  fallback: Required<AiRuntimeOptions>
): Required<AiRuntimeOptions> => {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    contextWindow:
      readPositiveInteger(value.contextWindow) ?? fallback.contextWindow,
    timeoutMs: readPositiveInteger(value.timeoutMs) ?? fallback.timeoutMs
  };
};

const createLegacyFallback = (): PersistedLlmSettings => {
  const model = readStoredModel();

  return {
    ...(model ? { model } : {}),
    modelKind: inferLlmModelKind(model),
    runtime: readStoredRuntimeSettings()
  };
};

const normalizeStoredSettings = (
  value: unknown,
  fallback: PersistedLlmSettings
): PersistedLlmSettings => {
  if (!isRecord(value)) {
    return fallback;
  }

  const stored = value as StoredLlmSettings;
  const model = readString(stored.model) ?? fallback.model;
  const flatRuntime = {
    contextWindow: stored.contextWindow,
    timeoutMs: stored.timeoutMs
  };
  const runtime = normalizeRuntimeSettings(
    isRecord(stored.runtime) ? stored.runtime : flatRuntime,
    fallback.runtime
  );
  const modelKind =
    readModelKind(stored.modelKind) ?? fallback.modelKind ?? inferLlmModelKind(model);
  const updatedAt = readString(stored.updatedAt) ?? fallback.updatedAt;

  return {
    ...(model ? { model } : {}),
    modelKind,
    runtime,
    ...(updatedAt ? { updatedAt } : {})
  };
};

export const defaultLlmSettings: PersistedLlmSettings = {
  modelKind: "local",
  runtime: defaultRuntimeSettings
};

export const readStoredLlmSettings = (): PersistedLlmSettings => {
  if (typeof window === "undefined") {
    return defaultLlmSettings;
  }

  const fallback = createLegacyFallback();
  const rawValue = window.localStorage.getItem(llmSettingsStorageKey);

  if (!rawValue) {
    return fallback;
  }

  try {
    return normalizeStoredSettings(JSON.parse(rawValue) as unknown, fallback);
  } catch {
    return fallback;
  }
};

export const storeLlmSettings = (
  settings: PersistedLlmSettings
): PersistedLlmSettings => {
  const model = readString(settings.model);
  const nextSettings: PersistedLlmSettings = {
    ...(model ? { model } : {}),
    modelKind: settings.modelKind,
    runtime: normalizeRuntimeSettings(settings.runtime, defaultRuntimeSettings),
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      llmSettingsStorageKey,
      JSON.stringify(nextSettings)
    );
    window.localStorage.setItem(
      runtimeSettingsStorageKey,
      JSON.stringify(nextSettings.runtime)
    );
    if (nextSettings.model) {
      window.localStorage.setItem(selectedModelStorageKey, nextSettings.model);
    }
  }

  return nextSettings;
};

export const updateStoredLlmSettings = (
  patch: Partial<Omit<PersistedLlmSettings, "runtime">> & {
    runtime?: AiRuntimeOptions;
  }
): PersistedLlmSettings => {
  const currentSettings = readStoredLlmSettings();
  const model = patch.model?.trim() || currentSettings.model;
  const runtime = {
    ...currentSettings.runtime,
    ...patch.runtime
  };
  const modelKind =
    patch.modelKind ?? currentSettings.modelKind ?? inferLlmModelKind(model);

  return storeLlmSettings({
    ...(model ? { model } : {}),
    modelKind,
    runtime
  });
};

export const storeSelectedLlmModel = (
  model: string,
  options: { baseUrl?: string } = {}
): PersistedLlmSettings =>
  updateStoredLlmSettings({
    model,
    modelKind: inferLlmModelKind(model, options.baseUrl)
  });
