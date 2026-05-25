import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AI_CONFIG } from "@/config/ai-config";
import { checkOllamaReadiness } from "./ollama-readiness";

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

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
          models: [{ name: DEFAULT_AI_CONFIG.model }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ model: DEFAULT_AI_CONFIG.model }]
        })
      );

    await expect(checkOllamaReadiness()).resolves.toMatchObject({
      ready: true,
      model: DEFAULT_AI_CONFIG.model,
      loadedModels: [DEFAULT_AI_CONFIG.model]
    });
  });

  it("reports not ready when the configured model is installed but not loaded", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ name: DEFAULT_AI_CONFIG.model }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: []
        })
      );

    await expect(checkOllamaReadiness()).resolves.toMatchObject({
      ready: false,
      code: "AI_MODEL_NOT_READY",
      model: DEFAULT_AI_CONFIG.model,
      message: expect.stringContaining("not loaded")
    });
  });

  it("reports not ready when the configured model is missing", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        models: [{ name: "other-model:latest" }]
      })
    );

    await expect(checkOllamaReadiness()).resolves.toMatchObject({
      ready: false,
      code: "AI_MODEL_NOT_READY",
      model: DEFAULT_AI_CONFIG.model,
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
