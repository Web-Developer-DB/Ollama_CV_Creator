import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AI_CONFIG, getAiConfig } from "@/config/ai-config";
import {
  generateOllamaJson,
  generateOllamaText,
  OllamaClientError
} from "./ollama-client";

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const readyModel = "selected-model:latest";

const createReadyGenerateFetchMock = (generatedBody: unknown) =>
  vi
    .fn()
    .mockResolvedValueOnce(
      createJsonResponse({
        models: [{ name: readyModel }]
      })
    )
    .mockResolvedValueOnce(
      createJsonResponse({
        models: [{ model: readyModel }]
      })
    )
    .mockResolvedValueOnce(createJsonResponse(generatedBody));

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
    const fetchMock = createReadyGenerateFetchMock({
      response: "Generated text",
      done: true
    });
    global.fetch = fetchMock;

    await expect(
      generateOllamaText({
        prompt: "Return JSON",
        system: "Return valid JSON only"
      })
    ).resolves.toBe("Generated text");
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("sends generation requests to the loaded model", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [
            { name: "another-installed-model:latest" },
            { name: "nemotron-3-nano:4b-q8_0" }
          ]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ model: "nemotron-3-nano:4b-q8_0" }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          response: "Generated text",
          done: true
        })
      );
    global.fetch = fetchMock;

    await generateOllamaText({
      prompt: "Return JSON",
      system: "Return valid JSON only"
    });

    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toMatchObject({
      model: "nemotron-3-nano:4b-q8_0"
    });
  });

  it("passes Ollama generation budgets through request options", async () => {
    const fetchMock = createReadyGenerateFetchMock({
      response: "Generated text",
      done: true
    });
    global.fetch = fetchMock;

    await generateOllamaText({
      prompt: "Return JSON",
      system: "Return valid JSON only",
      temperature: 0.1,
      think: false,
      numCtx: 8192,
      numPredict: 4096
    });
    const requestBody = JSON.parse(
      fetchMock.mock.calls[2]?.[1]?.body as string
    );

    expect(requestBody.options).toEqual({
      temperature: 0.1,
      num_ctx: 8192,
      num_predict: 4096
    });
    expect(requestBody.think).toBe(false);
  });

  it("parses a JSON response", async () => {
    const fetchMock = createReadyGenerateFetchMock({
      response: "{\"ok\":true}",
      done: true
    });
    global.fetch = fetchMock;

    await expect(
      generateOllamaJson<{ ok: boolean }>({
        prompt: "Return JSON",
        system: "Return valid JSON only"
      })
    ).resolves.toEqual({ ok: true });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toMatchObject({
      format: "json",
      think: false
    });
  });

  it("parses JSON wrapped in thinking text and markdown fences", async () => {
    global.fetch = createReadyGenerateFetchMock({
      response: "<think>Checking the schema.</think>\n```json\n{\"ok\":true}\n```",
      done: true
    });

    await expect(
      generateOllamaJson<{ ok: boolean }>({
        prompt: "Return JSON",
        system: "Return valid JSON only"
      })
    ).resolves.toEqual({ ok: true });
  });

  it("extracts balanced JSON from surrounding model text", async () => {
    global.fetch = createReadyGenerateFetchMock({
      response: "Here is the JSON:\n{\"ok\":true}\nDone.",
      done: true
    });

    await expect(
      generateOllamaJson<{ ok: boolean }>({
        prompt: "Return JSON",
        system: "Return valid JSON only"
      })
    ).resolves.toEqual({ ok: true });
  });

  it("uses Ollama thinking text when reasoning models return an empty response", async () => {
    global.fetch = createReadyGenerateFetchMock({
      response: "",
      thinking: "{\n  \"ok\": true\n}",
      done: true
    });

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

  it("rejects generation when the configured model is not loaded", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          models: [{ name: readyModel }]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          models: []
        })
      );
    global.fetch = fetchMock;

    await expect(
      generateOllamaText({
        prompt: "Return JSON",
        system: "Return valid JSON only",
        model: readyModel
      })
    ).rejects.toMatchObject({
      code: "AI_MODEL_NOT_READY",
      message: expect.stringContaining("not loaded")
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
