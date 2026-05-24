import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AI_CONFIG, getAiConfig } from "@/config/ai-config";
import {
  generateOllamaJson,
  generateOllamaText,
  OllamaClientError
} from "./ollama-client";

describe("Ollama client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("configures the default base URL", () => {
    expect(DEFAULT_AI_CONFIG.baseUrl).toBe("http://127.0.0.1:11434");
    expect(getAiConfig().baseUrl).toBe("http://127.0.0.1:11434");
  });

  it("supports environment base URL overrides", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11435/");

    expect(getAiConfig().baseUrl).toBe("http://localhost:11435");
  });

  it("parses a successful text response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: "Generated text",
          done: true
        }),
        { status: 200 }
      )
    );
    global.fetch = fetchMock;

    await expect(
      generateOllamaText({
        prompt: "Return JSON",
        system: "Return valid JSON only"
      })
    ).resolves.toBe("Generated text");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("parses a JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: "{\"ok\":true}",
          done: true
        }),
        { status: 200 }
      )
    );

    await expect(
      generateOllamaJson<{ ok: boolean }>({
        prompt: "Return JSON",
        system: "Return valid JSON only"
      })
    ).resolves.toEqual({ ok: true });
  });

  it("handles unavailable Ollama", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      generateOllamaText({
        prompt: "Return JSON",
        system: "Return valid JSON only"
      })
    ).rejects.toMatchObject({
      code: "OLLAMA_UNAVAILABLE"
    });
  });

  it("handles timeouts", async () => {
    global.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const request = generateOllamaText(
      {
        prompt: "Return JSON",
        system: "Return valid JSON only"
      },
      { timeoutMs: 25 }
    ).catch((caughtError: unknown) => caughtError);
    await vi.advanceTimersByTimeAsync(25);

    const error = await request;

    expect(error).toBeInstanceOf(OllamaClientError);
    expect(error).toMatchObject({
      code: "AI_TIMEOUT"
    });
  });
});
