import { afterEach, describe, expect, it } from "vitest";
import {
  inferLlmModelKind,
  llmSettingsStorageKey,
  readStoredLlmSettings,
  storeLlmSettings,
  storeSelectedLlmModel,
  updateStoredLlmSettings
} from "@/lib/ai/llm-settings";
import { runtimeSettingsStorageKey } from "@/lib/ai/runtime-settings";
import { selectedModelStorageKey } from "@/lib/ai/selected-model";

describe("LLM settings storage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("reads legacy model and runtime settings when the combined record is missing", () => {
    window.localStorage.setItem(selectedModelStorageKey, "llama3.2:3b");
    window.localStorage.setItem(
      runtimeSettingsStorageKey,
      JSON.stringify({
        contextWindow: 16384,
        timeoutMs: 300000
      })
    );

    expect(readStoredLlmSettings()).toEqual({
      model: "llama3.2:3b",
      modelKind: "local",
      runtime: {
        contextWindow: 16384,
        timeoutMs: 300000
      }
    });
  });

  it("stores model, model kind, runtime settings, and legacy compatibility keys", () => {
    const settings = storeLlmSettings({
      model: "gpt-oss:120b-cloud",
      modelKind: "cloud",
      runtime: {
        contextWindow: 32768,
        timeoutMs: 600000
      }
    });

    expect(settings).toMatchObject({
      model: "gpt-oss:120b-cloud",
      modelKind: "cloud",
      runtime: {
        contextWindow: 32768,
        timeoutMs: 600000
      }
    });
    expect(
      JSON.parse(window.localStorage.getItem(llmSettingsStorageKey)!)
    ).toMatchObject({
      model: "gpt-oss:120b-cloud",
      modelKind: "cloud",
      runtime: {
        contextWindow: 32768,
        timeoutMs: 600000
      }
    });
    expect(window.localStorage.getItem(selectedModelStorageKey)).toBe(
      "gpt-oss:120b-cloud"
    );
    expect(
      JSON.parse(window.localStorage.getItem(runtimeSettingsStorageKey)!)
    ).toEqual({
      contextWindow: 32768,
      timeoutMs: 600000
    });
  });

  it("updates one runtime field without losing the stored model", () => {
    storeSelectedLlmModel("granite4.1:3b-q6_K");

    const settings = updateStoredLlmSettings({
      runtime: {
        timeoutMs: 300000
      }
    });

    expect(settings).toMatchObject({
      model: "granite4.1:3b-q6_K",
      modelKind: "local",
      runtime: {
        contextWindow: 8192,
        timeoutMs: 300000
      }
    });
  });

  it("infers cloud models from names and direct cloud hosts", () => {
    expect(inferLlmModelKind("gpt-oss:120b-cloud")).toBe("cloud");
    expect(inferLlmModelKind("gpt-oss:120b", "https://ollama.com")).toBe(
      "cloud"
    );
    expect(inferLlmModelKind("llama3.2:3b")).toBe("local");
  });
});
