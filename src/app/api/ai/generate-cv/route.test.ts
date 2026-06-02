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

const validCVWithProfileContact: GeneratedCV = {
  ...validCV,
  contact: {
    email: "ada@example.com"
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
      data: validCVWithProfileContact
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.4
      }),
      { model: selectedModel }
    );
  });

  it("returns a general generated CV without a job target", async () => {
    generateOllamaJson.mockResolvedValue(validCV);

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
      data: validCVWithProfileContact
    });
    expect(promptRequest.prompt).toContain("general professional");
    expect(promptRequest.prompt).toContain("None provided");
  });

  it("normalizes recoverable model CV output before validation", async () => {
    generateOllamaJson.mockResolvedValue({
      title: "Frontend Engineer CV",
      language: "en",
      sections: [
        {
          type: "work_experience",
          title: "Work Experience",
          items: [
            {
              role: "Frontend Engineer",
              company: "Acme GmbH",
              responsibilities: ["Built accessible React components"]
            }
          ]
        }
      ]
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        id: "generated-cv",
        language: "en",
        sections: [
          {
            id: "section-experience-1",
            type: "experience",
            title: "Work Experience",
            items: [
              {
                id: "item-experience-1",
                title: "Frontend Engineer",
                subtitle: "Acme GmbH",
                bullets: ["Built accessible React components"]
              }
            ]
          }
        ]
      }
    });
    expect(payload.data.meta.generatedAt).toEqual(expect.any(String));
  });

  it("normalizes snake_case CV section keys from local models", async () => {
    generateOllamaJson.mockResolvedValue({
      id: "cv-snake",
      title: "Frontend Engineer CV",
      language: "en",
      sections: [
        {
          section_type: "skills",
          section_title: "Skills",
          entries: [
            {
              name: "Technical skills",
              content: "React, TypeScript"
            }
          ]
        }
      ],
      meta: {
        generated_at: "2026-05-24T00:00:00.000Z"
      }
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        sections: [
          {
            type: "skills",
            title: "Skills",
            items: [
              {
                title: "Technical skills",
                body: "React, TypeScript"
              }
            ]
          }
        ],
        meta: {
          generatedAt: "2026-05-24T00:00:00.000Z"
        }
      }
    });
  });

  it("normalizes wrapped resume output with top-level document aliases", async () => {
    generateOllamaJson.mockResolvedValue({
      generated_cv: {
        title: "Frontend Engineer CV",
        language: "en",
        work_history: [
          {
            position: "Frontend Engineer",
            employer: "Acme GmbH",
            start: 2022,
            tasks: ["Built accessible React components"]
          }
        ],
        skills: {
          technical_skills: ["React", "TypeScript"]
        },
        meta: {
          generated_at: "2026-05-24T00:00:00.000Z"
        }
      }
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        title: "Frontend Engineer CV",
        sections: [
          {
            type: "experience",
            items: [
              {
                title: "Frontend Engineer",
                subtitle: "Acme GmbH",
                dateRange: "2022",
                bullets: ["Built accessible React components"]
              }
            ]
          },
          {
            type: "skills",
            items: [
              {
                title: "Technical skills",
                bullets: ["React, TypeScript"]
              }
            ]
          }
        ]
      }
    });
  });

  it("accepts generated skill wording backed by profile experience facts", async () => {
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
              title: "Professional focus",
              bullets: ["Frontend engineering"]
            }
          ]
        }
      ]
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true
    });
  });

  it("accepts translated skill labels when they are backed by profile skills", async () => {
    generateOllamaJson.mockResolvedValue({
      ...validCV,
      language: "de",
      sections: [
        {
          id: "section-skills",
          type: "skills",
          title: "Fähigkeiten",
          items: [
            {
              id: "item-skills-1",
              title: "Technische Fähigkeiten",
              bullets: [
                "GraphQL (Grundlagen), SQL (Grundlagen), PHP (Grundlagen), Barrierefreiheit, Schema-Validierung, Komponententest"
              ]
            },
            {
              id: "item-skills-2",
              title: "Soft Skills",
              bullets: [
                "Stakeholder-Kommunikation, Strukturiertes Problemlösen, Produkt-Denken, Workshop-Moderation, sorgfältige Dokumentation, bereichsübergreifende Zusammenarbeit"
              ]
            }
          ]
        }
      ]
    });

    const response = await POST(
      createRequest({
        ...requestBody,
        candidateProfile: {
          ...requestBody.candidateProfile,
          skills: {
            technical: [
              "GraphQL basics",
              "SQL basics",
              "PHP basics",
              "accessibility",
              "schema validation",
              "component testing"
            ],
            soft: [
              "stakeholder communication",
              "structured problem solving",
              "product thinking",
              "workshop facilitation",
              "careful documentation",
              "cross-functional collaboration"
            ],
            tools: [],
            languages: [],
            methods: []
          }
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

  it("generates a draft when useful profile facts exist but personal details are missing", async () => {
    generateOllamaJson.mockResolvedValue({
      id: "minimal-cv",
      language: "en",
      sections: [
        {
          id: "section-skills",
          type: "skills",
          title: "Skills",
          items: [
            {
              id: "item-skills-1",
              title: "Technical skills",
              bullets: ["React"]
            }
          ]
        }
      ],
      meta: {
        generatedAt: "2026-05-24T00:00:00.000Z"
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
        id: "minimal-cv",
        meta: {
          warnings: expect.arrayContaining([
            expect.stringContaining("Name fehlt"),
            expect.stringContaining("Kontaktmöglichkeit fehlt")
          ])
        }
      }
    });
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

  it("falls back to a source-backed CV when generated CVs contain new employers", async () => {
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

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        meta: {
          warnings: [expect.stringContaining("Invented Corp"), expect.any(String)]
        }
      }
    });
    expect(JSON.stringify(payload.data.sections)).not.toContain("Invented Corp");
  });

  it("falls back to a source-backed CV when generated CVs contain new skills", async () => {
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

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        meta: {
          warnings: [expect.stringMatching(/rust/i), expect.any(String)]
        }
      }
    });
    expect(JSON.stringify(payload.data.sections)).not.toContain("Rust");
  });

  it("falls back to a source-backed CV when generated CVs contain unsupported certificates and dates", async () => {
    generateOllamaJson.mockResolvedValue({
      ...validCV,
      sections: [
        ...validCV.sections,
        {
          id: "section-certificates",
          type: "certificates",
          title: "Certificates",
          items: [
            {
              id: "item-certificate-1",
              title: "AWS Solutions Architect",
              dateRange: "2024",
              bullets: []
            }
          ]
        }
      ]
    });

    const response = await POST(createRequest(requestBody));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        meta: {
          warnings: [
            expect.stringContaining("AWS Solutions Architect"),
            expect.any(String)
          ]
        }
      }
    });
    expect(JSON.stringify(payload.data.sections)).not.toContain(
      "AWS Solutions Architect"
    );
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
