import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/ai/status", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("reports reachable Ollama and loaded selected model", async () => {
    vi.stubEnv("OLLAMA_MODEL", "qwen3.5:4b");
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              {
                name: "qwen3.5:4b",
                modified_at: "2026-05-22T12:00:00Z",
                size: 3_400_000_000,
                digest: "abc123",
                details: {
                  parameter_size: "4B",
                  quantization_level: "Q4_K_M"
                }
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              {
                name: "qwen3.5:4b",
                size: 3_400_000_000,
                size_vram: 3_100_000_000,
                expires_at: "2026-05-25T12:10:00Z",
                details: {
                  parameter_size: "4B",
                  quantization_level: "Q4_K_M"
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        reachable: true,
        configuredModel: "qwen3.5:4b",
        selectedModelAvailable: true,
        selectedModelLoaded: true,
        loadedModels: [
          {
            name: "qwen3.5:4b",
            sizeVram: 3_100_000_000,
            expiresAt: "2026-05-25T12:10:00Z"
          }
        ],
        models: [
          {
            name: "qwen3.5:4b",
            loaded: true,
            parameterSize: "4B",
            quantizationLevel: "Q4_K_M"
          }
        ]
      }
    });
  });

  it("reports installed models as not loaded when Ollama has no running model", async () => {
    vi.stubEnv("OLLAMA_MODEL", "qwen3.5:4b");
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              {
                name: "qwen3.5:4b",
                modified_at: "2026-05-22T12:00:00Z",
                size: 3_400_000_000
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: []
          }),
          { status: 200 }
        )
      );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        reachable: true,
        configuredModel: "qwen3.5:4b",
        selectedModelAvailable: true,
        selectedModelLoaded: false,
        loadedModels: [],
        models: [
          {
            name: "qwen3.5:4b",
            loaded: false
          }
        ]
      }
    });
  });

  it("reports unavailable Ollama without failing the status endpoint", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        reachable: false,
        selectedModelLoaded: false,
        loadedModels: [],
        models: []
      }
    });
  });
});
