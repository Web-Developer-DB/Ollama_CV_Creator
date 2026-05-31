import { describe, expect, it, vi } from "vitest";
import shutdownModule from "./ollama-shutdown.cjs";

const { collectModelNames, unloadLoadedOllamaModels } = shutdownModule;

const createJsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(body)
});

describe("Ollama shutdown cleanup", () => {
  it("deduplicates loaded model names from Ollama status", () => {
    expect(
      collectModelNames({
        models: [
          { name: "model-a:latest" },
          { model: "model-a:latest" },
          { model: "model-b:latest" },
          { name: "" },
          null
        ]
      })
    ).toEqual(["model-a:latest", "model-b:latest"]);
  });

  it("unloads every currently loaded Ollama model on shutdown", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [
            { name: "model-a:latest" },
            { model: "model-b:latest" },
            { model: "model-a:latest" }
          ]
        })
      )
      .mockResolvedValue(createJsonResponse({ done: true }));

    const result = await unloadLoadedOllamaModels({
      baseUrl: "http://127.0.0.1:11434/",
      timeoutMs: 500,
      fetchImpl
    });

    expect(result).toMatchObject({
      attempted: true,
      loadedModels: ["model-a:latest", "model-b:latest"],
      unloadedModels: ["model-a:latest", "model-b:latest"],
      failedModels: []
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:11434/api/ps",
      expect.objectContaining({
        method: "GET",
        cache: "no-store"
      })
    );
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toMatchObject({
      model: "model-a:latest",
      prompt: "",
      stream: false,
      keep_alive: 0
    });
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toMatchObject({
      model: "model-b:latest",
      keep_alive: 0
    });
  });

  it("does nothing when Ollama reports no loaded models", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ models: [] }));

    const result = await unloadLoadedOllamaModels({
      baseUrl: "http://127.0.0.1:11434",
      timeoutMs: 500,
      fetchImpl
    });

    expect(result).toMatchObject({
      attempted: false,
      loadedModels: [],
      unloadedModels: [],
      failedModels: []
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("continues shutdown when Ollama cannot be reached", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("offline"));

    const result = await unloadLoadedOllamaModels({
      baseUrl: "http://127.0.0.1:11434",
      timeoutMs: 500,
      fetchImpl
    });

    expect(result).toMatchObject({
      attempted: false,
      loadedModels: [],
      unloadedModels: [],
      failedModels: [],
      error: "offline"
    });
  });

  it("records unload failures and keeps unloading remaining models", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ name: "model-a:latest" }, { name: "model-b:latest" }]
        })
      )
      .mockResolvedValueOnce(createJsonResponse({ error: "busy" }, 500))
      .mockResolvedValueOnce(createJsonResponse({ done: true }));

    const result = await unloadLoadedOllamaModels({
      baseUrl: "http://127.0.0.1:11434",
      timeoutMs: 500,
      fetchImpl
    });

    expect(result).toMatchObject({
      attempted: true,
      unloadedModels: ["model-b:latest"],
      failedModels: [
        {
          model: "model-a:latest",
          error: "HTTP 500"
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
