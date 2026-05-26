import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const createRequest = (body: unknown): Request =>
  new Request("http://localhost/api/ai/model-control", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });

describe("POST /api/ai/model-control", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("loads a selected model with keep_alive", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const response = await POST(
      createRequest({ action: "load", model: "granite4.1:3b-q6_K" })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        action: "load",
        model: "granite4.1:3b-q6_K"
      }
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: "granite4.1:3b-q6_K",
          prompt: "",
          stream: false,
          keep_alive: -1
        })
      })
    );
  });

  it("unloads a selected model immediately", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const response = await POST(
      createRequest({ action: "unload", model: "granite4.1:3b-q6_K" })
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: "granite4.1:3b-q6_K",
          prompt: "",
          stream: false,
          keep_alive: 0
        })
      })
    );
  });

  it("rejects invalid input", async () => {
    global.fetch = vi.fn();

    const response = await POST(createRequest({ action: "load", model: "" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "INVALID_INPUT"
      }
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
