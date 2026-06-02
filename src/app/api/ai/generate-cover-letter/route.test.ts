import { beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaClientError } from "@/lib/ai/ollama-client";
import type { GenerateCoverLetterRequest } from "@/types/api";
import type { GeneratedCoverLetter } from "@/types/documents";
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

const requestBody: GenerateCoverLetterRequest = {
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
    requiredSkills: ["React", "TypeScript", "Rust"],
    optionalSkills: [],
    responsibilities: ["Build accessible user interfaces"],
    keywords: ["frontend", "accessibility"],
    softSkills: ["Collaboration"],
    strengths: ["Strong React background"],
    gaps: ["No Rust evidence"],
    recommendations: ["Emphasize accessibility projects"]
  },
  options: {
    language: "en",
    tone: "professional"
  }
};

const validCoverLetter: GeneratedCoverLetter = {
  id: "cover-letter-1",
  language: "en",
  recipient: {
    company: "Target GmbH"
  },
  subject: "Application for Frontend Engineer at Target GmbH",
  greeting: "Dear hiring team,",
  opening:
    "I am applying for the Frontend Engineer role at Target GmbH.",
  body: [
    "My React and TypeScript work at Acme GmbH focused on accessible components.",
    "I would bring a collaborative approach to the frontend team."
  ],
  closing: "Sincerely,",
  signature: "Ada Lovelace",
  meta: {
    generatedAt: "2026-05-24T00:00:00.000Z"
  }
};

const validGeneralCoverLetter: GeneratedCoverLetter = {
  ...validCoverLetter,
  id: "cover-letter-general",
  recipient: undefined,
  subject: "General application",
  opening: "I am writing to introduce my frontend engineering profile.",
  body: [
    "My React and TypeScript work at Acme GmbH focused on accessible components."
  ]
};

const createRequest = (body: unknown): Request =>
  new Request("http://localhost/api/ai/generate-cover-letter", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });

const readJson = async (response: Response) => response.json() as Promise<any>;

describe("POST /api/ai/generate-cover-letter", () => {
  beforeEach(() => {
    generateOllamaJson.mockReset();
  });

  it("uses company and role when present", async () => {
    generateOllamaJson.mockResolvedValue(validCoverLetter);

    const response = await POST(
      createRequest({
        ...requestBody,
        model: selectedModel
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      recipient: {
        company: "Target GmbH"
      },
      subject: "Application for Frontend Engineer at Target GmbH"
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.5
      }),
      { model: selectedModel }
    );
  });

  it("rejects invented facts", async () => {
    generateOllamaJson.mockResolvedValue({
      ...validCoverLetter,
      body: [
        "My React, TypeScript and Rust background is a strong fit for Target GmbH."
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

  it("accepts translated backed skills in tailored cover letters", async () => {
    generateOllamaJson.mockResolvedValue({
      ...validCoverLetter,
      language: "de",
      body: [
        "Meine Erfahrung mit Barrierefreiheit und Schema-Validierung passt gut zur Rolle bei Target GmbH."
      ]
    });

    const response = await POST(
      createRequest({
        ...requestBody,
        candidateProfile: {
          ...requestBody.candidateProfile,
          skills: {
            technical: ["accessibility", "schema validation"],
            soft: [],
            tools: [],
            languages: [],
            methods: []
          }
        },
        jobAnalysis: {
          ...requestBody.jobAnalysis,
          requiredSkills: ["Barrierefreiheit", "Schema-Validierung"],
          gaps: []
        },
        options: {
          ...requestBody.options,
          language: "de"
        }
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true
    });
  });

  it("generates a cover letter draft without inventing a missing candidate name", async () => {
    generateOllamaJson.mockResolvedValue({
      cover_letter: {
        id: "minimal-letter",
        language: "en",
        subject: "General application",
        body: [
          "I am writing to introduce my React frontend engineering profile."
        ],
        meta: {
          generated_at: "2026-05-24T00:00:00.000Z"
        }
      }
    });

    const response = await POST(
      createRequest({
        candidateProfile: {
          personalInfo: {},
          experiences: [],
          education: [],
          skills: {
            technical: ["React"],
            soft: [],
            tools: [],
            languages: [],
            methods: []
          },
          projects: [],
          languages: [],
          certificates: []
        },
        options: requestBody.options
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        id: "minimal-letter",
        closing: "Sincerely,",
        meta: {
          warnings: expect.arrayContaining([
            expect.stringContaining("Name fehlt"),
            expect.stringContaining("Anschreiben enthält keine Signatur")
          ])
        }
      }
    });
    expect(payload.data.signature).toBeUndefined();
  });

  it("returns a valid cover letter structure", async () => {
    generateOllamaJson.mockResolvedValue(validCoverLetter);

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: validCoverLetter
    });
  });

  it("rejects invented companies with semantic fact details", async () => {
    generateOllamaJson.mockResolvedValue({
      ...validCoverLetter,
      body: [
        "My React work at Acme GmbH and Invented Corp is relevant for Target GmbH."
      ]
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "HALLUCINATION_DETECTED",
        details: {
          unknownEmployers: ["Invented Corp"]
        }
      }
    });
  });

  it("returns a general cover letter without a job target", async () => {
    generateOllamaJson.mockResolvedValue(validGeneralCoverLetter);

    const response = await POST(
      createRequest({
        candidateProfile: requestBody.candidateProfile,
        options: requestBody.options
      })
    );
    const payload = await readJson(response);
    const [promptRequest] = generateOllamaJson.mock.calls[0] ?? [];

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: validGeneralCoverLetter
    });
    expect(promptRequest.prompt).toContain("general professional");
    expect(promptRequest.prompt).toContain("None provided");
  });

  it("normalizes recoverable cloud cover letter output before validation", async () => {
    generateOllamaJson.mockResolvedValue({
      cover_letter: {
        id: "cloud-letter",
        language: "en",
        recipient: null,
        subject: "General application",
        greeting: "Dear hiring team,",
        body: [
          "I am writing to introduce my frontend engineering profile.",
          "My React and TypeScript work at Acme GmbH focused on accessible components."
        ],
        closing: "Sincerely,",
        meta: {
          generated_at: "2026-05-24T00:00:00.000Z"
        }
      }
    });

    const response = await POST(
      createRequest({
        candidateProfile: requestBody.candidateProfile,
        options: requestBody.options
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        id: "cloud-letter",
        language: "en",
        subject: "General application",
        opening: "I am writing to introduce my frontend engineering profile.",
        body: [
          "My React and TypeScript work at Acme GmbH focused on accessible components."
        ],
        closing: "Sincerely,",
        signature: "Ada Lovelace",
        meta: {
          generatedAt: "2026-05-24T00:00:00.000Z"
        }
      }
    });
  });

  it("rejects unreasonable length", async () => {
    const longParagraph = Array.from({ length: 451 }, () => "word").join(" ");
    generateOllamaJson.mockResolvedValue({
      ...validCoverLetter,
      body: [longParagraph]
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "BUSINESS_RULE_FAILED"
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
