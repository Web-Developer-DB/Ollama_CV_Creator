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

  it("returns a clear error when the configured model is not loaded", async () => {
    generateOllamaJson.mockRejectedValue(
      new OllamaClientError(
        "AI_MODEL_NOT_READY",
        "Ollama model qwen3.5:4b is installed but not loaded. Open AI Status."
      )
    );

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
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

  it("handles schema validation failure", async () => {
    generateOllamaJson.mockResolvedValue([]);

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

  it("normalizes nullable optional fields from local LLM output", async () => {
    generateOllamaJson.mockResolvedValue({
      personalInfo: {
        fullName: "Ada Lovelace",
        email: null,
        phone: "",
        location: "Berlin"
      },
      summary: "",
      experiences: [],
      education: [],
      skills: {
        technical: ["TypeScript"],
        soft: [],
        tools: [],
        languages: [],
        methods: []
      },
      projects: [],
      languages: [],
      certificates: [],
      extractionMeta: {
        language: "en",
        uncertainFields: []
      }
    });

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      personalInfo: {
        fullName: "Ada Lovelace",
        location: "Berlin"
      },
      skills: {
        technical: ["TypeScript"]
      }
    });
    expect(payload.data.personalInfo).not.toHaveProperty("email");
    expect(payload.data).not.toHaveProperty("summary");
  });

  it("normalizes large education, training and work history payloads", async () => {
    generateOllamaJson.mockResolvedValue({
      personalInfo: {
        fullName: "Nora Stein"
      },
      experiences: [
        {
          company: "Acme Health GmbH",
          role: "Senior Frontend Engineer",
          startDate: "2023",
          endDate: "2026",
          responsibilities: "Led frontend delivery; Built accessible forms",
          achievements: ["Reduced user-reported form errors"],
          technologies: "React, TypeScript, Next.js"
        },
        {
          company: "Northstar Logistics AG",
          role: "Frontend Engineer",
          startDate: "2021",
          endDate: "2023",
          responsibilities: ["Built planning boards", "Improved load times"],
          achievements: "",
          technologies: ["React", "Redux Toolkit"]
        }
      ],
      education: [
        {
          institution: "Max-Planck-Gymnasium",
          degree: "Abitur",
          startDate: "2010",
          endDate: "2013",
          details: "Advanced mathematics; English"
        },
        {
          institution: "HTW Berlin",
          degree: "B.Sc.",
          field: "Medieninformatik",
          startDate: "2017",
          endDate: "2021",
          details: ["Human Computer Interaction", "Web Engineering"]
        }
      ],
      skills: {
        technical: "TypeScript, React, Next.js",
        soft: "Mentoring; stakeholder communication",
        tools: ["Figma, GitHub Actions"],
        languages: [],
        methods: ["Design systems", "Accessibility"]
      },
      projects: [
        {
          name: "Accessible component library",
          role: "Maintainer",
          highlights: "Created reusable controls; Added accessibility guidance",
          technologies: "React, TypeScript"
        }
      ],
      languages: [
        {
          language: "German",
          proficiency: "native"
        }
      ],
      certificates: [
        {
          name: "Professional Scrum Master I",
          issuer: "Scrum.org",
          issueDate: "2019"
        },
        {
          name: "AWS Cloud Practitioner Essentials",
          issuer: "AWS",
          issueDate: "2023"
        }
      ],
      extractionMeta: {
        language: "en",
        uncertainFields: ""
      }
    });

    const response = await POST(
      createRequest({ text: "Long Nora Stein profile.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.experiences).toHaveLength(2);
    expect(payload.data.education).toHaveLength(2);
    expect(payload.data.certificates).toHaveLength(2);
    expect(payload.data.experiences[0]).toMatchObject({
      id: "experience-1",
      responsibilities: ["Led frontend delivery", "Built accessible forms"],
      technologies: ["React", "TypeScript", "Next.js"]
    });
    expect(payload.data.education[0]).toMatchObject({
      id: "education-1",
      details: ["Advanced mathematics", "English"]
    });
    expect(payload.data.projects[0]).toMatchObject({
      id: "project-1",
      highlights: ["Created reusable controls", "Added accessibility guidance"]
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
        numCtx: 4096,
        numPredict: 2048,
        think: false,
        temperature: 0.1
      })
    );
  });

  it("passes a selected model to Ollama generation", async () => {
    generateOllamaJson.mockResolvedValue(validProfile);

    const response = await POST(
      createRequest({
        text: "Ada writes TypeScript.",
        language: "en",
        model: "granite4.1:3b-q6_K"
      })
    );

    expect(response.status).toBe(200);
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.1
      }),
      { model: "granite4.1:3b-q6_K" }
    );
  });
});
