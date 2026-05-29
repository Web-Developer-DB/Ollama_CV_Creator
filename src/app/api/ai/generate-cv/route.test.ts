import { beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaClientError } from "@/lib/ai/ollama-client";
import type { GenerateCVRequest } from "@/types/api";
import type { GeneratedCV } from "@/types/documents";
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

const selectedModel = "installed-selected-model:latest";

const requestBody: GenerateCVRequest = {
  candidateProfile: {
    personalInfo: {
      fullName: "Ada Lovelace",
      email: "ada@example.com"
    },
    summary: "Frontend engineer focused on accessible React applications.",
    experiences: [
      {
        id: "exp-1",
        company: "Acme GmbH",
        role: "Frontend Engineer",
        location: "Berlin",
        startDate: "2022",
        responsibilities: ["Built accessible React components"],
        achievements: [],
        technologies: ["React", "TypeScript"]
      }
    ],
    education: [],
    skills: {
      technical: ["React", "TypeScript"],
      soft: ["Collaboration"],
      tools: [],
      languages: ["English"],
      methods: []
    },
    projects: [],
    languages: [],
    certificates: []
  },
  jobTarget: {
    id: "job-1",
    title: "Frontend Engineer",
    company: "Target GmbH",
    jobDescription: "Build accessible React applications.",
    language: "en",
    tone: "professional"
  },
  jobAnalysis: {
    requiredSkills: ["React", "TypeScript"],
    optionalSkills: [],
    responsibilities: ["Build accessible user interfaces"],
    keywords: ["frontend", "accessibility"],
    softSkills: ["Collaboration"],
    strengths: ["Strong React background"],
    gaps: [],
    recommendations: ["Emphasize accessibility projects"]
  },
  options: {
    language: "en",
    length: "one_page",
    style: "modern"
  }
};

const validCV: GeneratedCV = {
  id: "cv-1",
  title: "Frontend Engineer CV",
  language: "en",
  summary: "Frontend engineer focused on accessible React applications.",
  sections: [
    {
      id: "section-exp",
      type: "experience",
      title: "Experience",
      items: [
        {
          id: "item-exp-1",
          title: "Frontend Engineer",
          subtitle: "Acme GmbH",
          body: "Built accessible React components.",
          bullets: ["Built accessible React components"]
        }
      ]
    },
    {
      id: "section-skills",
      type: "skills",
      title: "Skills",
      items: [
        {
          id: "item-skills-1",
          title: "Technical skills",
          bullets: ["React, TypeScript"]
        }
      ]
    }
  ],
  meta: {
    generatedAt: "2026-05-24T00:00:00.000Z"
  }
};

const createRequest = (body: unknown): Request =>
  new Request("http://localhost/api/ai/generate-cv", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });

const readJson = async (response: Response) => response.json() as Promise<any>;

describe("POST /api/ai/generate-cv", () => {
  beforeEach(() => {
    generateOllamaJson.mockReset();
  });

  it("returns a valid generated CV", async () => {
    generateOllamaJson.mockResolvedValue(validCV);

    const response = await POST(
      createRequest({
        ...requestBody,
        model: selectedModel
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: validCV
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.4
      }),
      { model: selectedModel }
    );
  });

  it("rejects an empty candidate", async () => {
    const response = await POST(
      createRequest({
        ...requestBody,
        candidateProfile: {
          personalInfo: {},
          experiences: [],
          education: [],
          skills: {
            technical: [],
            soft: [],
            tools: [],
            languages: [],
            methods: []
          },
          projects: [],
          languages: [],
          certificates: []
        }
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "BUSINESS_RULE_FAILED"
      }
    });
    expect(generateOllamaJson).not.toHaveBeenCalled();
  });

  it("rejects generated CVs with new employers", async () => {
    generateOllamaJson.mockResolvedValue({
      ...validCV,
      sections: [
        {
          id: "section-exp",
          type: "experience",
          title: "Experience",
          items: [
            {
              id: "item-exp-1",
              title: "Frontend Engineer",
              subtitle: "Invented Corp",
              bullets: ["Built accessible React components"]
            }
          ]
        }
      ]
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "HALLUCINATION_DETECTED"
      }
    });
  });

  it("rejects generated CVs with new skills", async () => {
    generateOllamaJson.mockResolvedValue({
      ...validCV,
      sections: [
        {
          id: "section-skills",
          type: "skills",
          title: "Skills",
          items: [
            {
              id: "item-skills-1",
              title: "Technical skills",
              bullets: ["React, Rust"]
            }
          ]
        }
      ]
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "HALLUCINATION_DETECTED"
      }
    });
  });

  it("returns a clear error when the configured model is not loaded", async () => {
    generateOllamaJson.mockRejectedValue(
      new OllamaClientError(
        "AI_MODEL_NOT_READY",
        "Ollama model qwen3.5:4b is installed but not loaded. Open AI Status."
      )
    );

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "AI_MODEL_NOT_READY",
        message: expect.stringContaining("Open AI Status")
      }
    });
  });
});
