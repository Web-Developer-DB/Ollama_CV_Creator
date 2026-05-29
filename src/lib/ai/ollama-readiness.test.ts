import { afterEach, describe, expect, it, vi } from "vitest";
import { checkOllamaReadiness } from "./ollama-readiness";

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const selectedModel = "selected-model:latest";
const loadedModel = "nemotron-3-nano:4b-q8_0";

describe("Ollama readiness", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("reports ready when the configured model is installed and loaded", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ name: selectedModel }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ model: selectedModel }]
        })
      );

    await expect(
      checkOllamaReadiness({ model: selectedModel })
    ).resolves.toMatchObject({
      ready: true,
      model: selectedModel,
      loadedModels: [selectedModel]
    });
  });

  it("reports not ready when the configured model is installed but not loaded", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ name: selectedModel }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: []
        })
      );

    await expect(
      checkOllamaReadiness({ model: selectedModel })
    ).resolves.toMatchObject({
      ready: false,
      code: "AI_MODEL_NOT_READY",
      model: selectedModel,
      message: expect.stringContaining("not loaded")
    });
  });

  it("reports not ready when the configured model is missing", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ name: "other-model:latest" }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: []
        })
      );

    await expect(
      checkOllamaReadiness({ model: selectedModel })
    ).resolves.toMatchObject({
      ready: false,
      code: "AI_MODEL_NOT_READY",
      model: selectedModel,
      message: expect.stringContaining("not installed")
    });
  });

  it("chooses a loaded model when no model is requested", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [
            { name: selectedModel },
            { name: loadedModel }
          ]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ model: loadedModel }]
        })
      );

    await expect(checkOllamaReadiness()).resolves.toMatchObject({
      ready: true,
      model: loadedModel,
      loadedModels: [loadedModel]
    });
  });

  it("does not fall back when the requested model is stale", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ name: loadedModel }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ model: loadedModel }]
        })
      );

    await expect(
      checkOllamaReadiness({ model: selectedModel })
    ).resolves.toMatchObject({
      ready: false,
      code: "AI_MODEL_NOT_READY",
      model: selectedModel,
      message: expect.stringContaining("not installed")
    });
  });

  it("reports unavailable when Ollama cannot be reached", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(checkOllamaReadiness()).resolves.toMatchObject({
      ready: false,
      code: "OLLAMA_UNAVAILABLE",
      message: expect.stringContaining("Open AI Status")
    });
  });
});
