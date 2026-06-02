// Browser-local runtime presets for generation. These values are appended to AI
// requests by the renderer client so all routes share the same context/timeout.
import type { AiRuntimeOptions } from "@/types/api";

export const runtimeSettingsStorageKey = "ollama-cv-runtime-settings";

export const contextWindowPresets = [
  {
    id: "compact",
    label: "Kompakt",
    value: 4096,
    summary: "Kurze Profile"
  },
  {
    id: "standard",
    label: "Standard",
    value: 8192,
    summary: "Empfohlen"
  },
  {
    id: "large",
    label: "Groß",
    value: 16384,
    summary: "Lange Profile"
  },
  {
    id: "maximum",
    label: "Maximal",
    value: 32768,
    summary: "Cloud/starke Rechner"
  }
] as const;

export const timeoutPresets = [
  {
    id: "standard",
    label: "Standard",
    value: 180_000,
    summary: "3 Minuten"
  },
  {
    id: "long",
    label: "Lang",
    value: 300_000,
    summary: "5 Minuten"
  },
  {
    id: "extended",
    label: "Erweitert",
    value: 600_000,
    summary: "10 Minuten"
  }
] as const;

export const defaultRuntimeSettings: Required<AiRuntimeOptions> = {
  contextWindow: 8192,
  timeoutMs: 180_000
};

const isRuntimeSettings = (value: unknown): value is AiRuntimeOptions => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const contextWindow = record.contextWindow;
  const timeoutMs = record.timeoutMs;
  const isPositiveInteger = (item: unknown): item is number =>
    typeof item === "number" && Number.isInteger(item) && item > 0;

  return (
    (contextWindow === undefined || isPositiveInteger(contextWindow)) &&
    (timeoutMs === undefined || isPositiveInteger(timeoutMs))
  );
};

export const readStoredRuntimeSettings = (): Required<AiRuntimeOptions> => {
  if (typeof window === "undefined") {
    return defaultRuntimeSettings;
  }

  const rawValue = window.localStorage.getItem(runtimeSettingsStorageKey);
  if (!rawValue) {
    return defaultRuntimeSettings;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    return isRuntimeSettings(parsedValue)
      ? {
          contextWindow:
            parsedValue.contextWindow ?? defaultRuntimeSettings.contextWindow,
          timeoutMs: parsedValue.timeoutMs ?? defaultRuntimeSettings.timeoutMs
        }
      : defaultRuntimeSettings;
  } catch {
    return defaultRuntimeSettings;
  }
};

export const storeRuntimeSettings = (
  settings: AiRuntimeOptions
): Required<AiRuntimeOptions> => {
  const nextSettings = {
    contextWindow:
      settings.contextWindow ?? defaultRuntimeSettings.contextWindow,
    timeoutMs: settings.timeoutMs ?? defaultRuntimeSettings.timeoutMs
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      runtimeSettingsStorageKey,
      JSON.stringify(nextSettings)
    );
  }

  return nextSettings;
};
