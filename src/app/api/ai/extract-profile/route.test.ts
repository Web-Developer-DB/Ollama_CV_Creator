import { beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaClientError } from "@/lib/ai/ollama-client";
import type { CandidateProfile } from "@/types/profile";
import { POST } from "./route";

vi.mock("@/lib/ai/ollama-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/ai/ollama-client")>();

  return {
    ...actual,
    generateOllamaJson: vi.fn()
  };
});

const { generateOllamaJson } = vi.mocked(
  await import("@/lib/ai/ollama-client")
);

const validProfile: CandidateProfile = {
  personalInfo: {
    fullName: "Ada Lovelace",
    email: "ada@example.com"
  },
  summary: "Software engineer focused on local-first tools.",
  experiences: [],
  education: [],
  skills: {
    technical: ["TypeScript"],
    soft: [],
    tools: [],
    languages: ["English"],
    methods: []
  },
  projects: [],
  languages: [],
  certificates: []
};

const createRequest = (body: unknown): Request =>
  new Request("http://localhost/api/ai/extract-profile", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });

const readJson = async (response: Response) => response.json() as Promise<any>;

describe("POST /api/ai/extract-profile", () => {
  beforeEach(() => {
    generateOllamaJson.mockReset();
  });

  it("rejects empty text", async () => {
    const response = await POST(createRequest({ text: " ", language: "en" }));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "INVALID_INPUT"
      }
    });
    expect(generateOllamaJson).not.toHaveBeenCalled();
  });

  it("handles invalid AI JSON", async () => {
    generateOllamaJson.mockRejectedValue(
      new OllamaClientError("INVALID_AI_JSON", "Invalid JSON")
    );

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "INVALID_AI_JSON"
      }
    });
  });

  it("handles schema validation failure", async () => {
    generateOllamaJson.mockResolvedValue({
      personalInfo: {},
      experiences: []
    });

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED"
      }
    });
  });

  it("returns a valid candidate profile", async () => {
    generateOllamaJson.mockResolvedValue(validProfile);

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: validProfile
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.1
      })
    );
  });
});
