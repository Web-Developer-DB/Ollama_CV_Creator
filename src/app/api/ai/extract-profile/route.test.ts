import { beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaClientError } from "@/lib/ai/ollama-client";
import { sampleCandidateContext } from "@/lib/demo/sample-candidate-context";
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

const emptyProfile: CandidateProfile = {
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
  certificates: [],
  extractionMeta: {
    language: "en",
    uncertainFields: ["personalInfo.fullName"]
  }
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

  it("falls back to source-text extraction when Ollama returns invalid JSON", async () => {
    generateOllamaJson.mockRejectedValue(
      new OllamaClientError("INVALID_AI_JSON", "Invalid JSON")
    );

    const response = await POST(
      createRequest({
        language: "en",
        text: `Demo candidate context: Ada Lovelace

Profile summary:
Ada writes TypeScript applications.

Skills:
Technical skills: TypeScript, React`
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        personalInfo: {
          fullName: "Ada Lovelace"
        },
        summary: "Ada writes TypeScript applications.",
        skills: {
          technical: ["TypeScript", "React"]
        },
        extractionMeta: {
          warnings: [expect.stringContaining("kein gültiges JSON")]
        }
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

  it("returns a clear error when schema recovery has no source facts", async () => {
    generateOllamaJson.mockResolvedValue([]);

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "BUSINESS_RULE_FAILED"
      }
    });
  });

  it("rejects an empty candidate profile returned by the model", async () => {
    generateOllamaJson.mockResolvedValue(emptyProfile);

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "BUSINESS_RULE_FAILED",
        message: expect.stringContaining("usable candidate profile data")
      }
    });
    expect(generateOllamaJson).toHaveBeenCalledTimes(2);
  });

  it("retries once when the model returns an empty profile first", async () => {
    generateOllamaJson
      .mockResolvedValueOnce(emptyProfile)
      .mockResolvedValueOnce(validProfile);

    const response = await POST(
      createRequest({ text: "Ada writes TypeScript.", language: "en" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: validProfile
    });
    expect(generateOllamaJson).toHaveBeenCalledTimes(2);
    expect(generateOllamaJson).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining("Recovery attempt")
      }),
      { timeoutMs: 120_000 }
    );
  });

  it("backfills clear labeled facts from source text when the model omits them", async () => {
    generateOllamaJson.mockResolvedValue({
      personalInfo: {
        email: "nora.stein@example.com"
      },
      experiences: [],
      education: [
        {
          id: "education-1",
          details: []
        }
      ],
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
    });

    const response = await POST(
      createRequest({
        language: "en",
        text: `Demo candidate context: Nora Stein

School education:
2010-2013 Max-Planck-Gymnasium, Berlin
- Abitur with advanced courses in mathematics and English.

Continuing education and certifications:
2019 Professional Scrum Master I, Scrum.org: Scrum roles and delivery flow.

Skills:
Technical skills: TypeScript, React
Tools: Figma, GitHub Actions
Methods: Accessibility, component testing
Soft skills: mentoring, stakeholder communication

Languages:
German native
English fluent`
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      personalInfo: {
        fullName: "Nora Stein",
        email: "nora.stein@example.com"
      },
      education: [
        {
          institution: "Max-Planck-Gymnasium",
          location: "Berlin",
          startDate: "2010",
          endDate: "2013",
          details: ["Abitur with advanced courses in mathematics and English."]
        }
      ],
      skills: {
        technical: ["TypeScript", "React"],
        tools: ["Figma", "GitHub Actions"],
        methods: ["Accessibility", "component testing"],
        soft: ["mentoring", "stakeholder communication"]
      },
      languages: [
        {
          language: "German",
          proficiency: "native"
        },
        {
          language: "English",
          proficiency: "fluent"
        }
      ],
      certificates: [
        {
          name: "Professional Scrum Master I",
          issuer: "Scrum.org",
          issueDate: "2019"
        }
      ]
    });
    expect(generateOllamaJson).toHaveBeenCalledTimes(1);
  });

  it("does not backfill invalid raw email addresses into a valid profile", async () => {
    generateOllamaJson.mockResolvedValue({
      personalInfo: {
        fullName: "Nora Stein"
      },
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
      certificates: []
    });

    const response = await POST(
      createRequest({
        language: "en",
        text: `Demo candidate context: Nora Stein
Email: not-an-email
Phone: +49 30 1234567

Profile summary:
Nora builds accessible TypeScript applications.`
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.personalInfo).toMatchObject({
      fullName: "Nora Stein",
      phone: "+49 30 1234567"
    });
    expect(payload.data.personalInfo.email).toBeUndefined();
  });

  it("backfills missing experience and projects from source text when the model returns a valid incomplete profile", async () => {
    generateOllamaJson.mockResolvedValue({
      personalInfo: {
        fullName: "Nora Stein"
      },
      experiences: [],
      education: [],
      skills: {
        technical: ["TypeScript", "React"],
        soft: [],
        tools: [],
        languages: [],
        methods: []
      },
      projects: [],
      languages: [],
      certificates: []
    });

    const response = await POST(
      createRequest({
        text: sampleCandidateContext,
        language: "de"
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.personalInfo).toMatchObject({
      fullName: "Nora Stein",
      phone: "+49 30 1234567",
      location: "Berlin",
      linkedin: "linkedin.com/in/nora-stein-demo"
    });
    expect(payload.data.experiences[0]).toMatchObject({
      role: "Senior Frontend Engineer",
      company: "Acme Health GmbH",
      location: "Berlin",
      startDate: "2023",
      endDate: "2026"
    });
    expect(payload.data.experiences[0].responsibilities).toContain(
      "Led frontend delivery for a patient onboarding and document workflow used by clinics and insurance partners."
    );
    expect(payload.data.experiences[0].technologies).toEqual([
      "React",
      "TypeScript",
      "Next.js",
      "Tailwind CSS",
      "Zustand",
      "REST APIs",
      "Zod",
      "Vitest",
      "Playwright",
      "Figma",
      "GitHub Actions."
    ]);
    expect(payload.data.projects[0]).toMatchObject({
      name: "Patient document workflow",
      role: "frontend lead",
      technologies: [
        "React",
        "Next.js",
        "TypeScript",
        "Zod",
        "Tailwind CSS",
        "Playwright."
      ]
    });
    expect(payload.data.experiences).toHaveLength(4);
    expect(payload.data.projects).toHaveLength(3);
    expect(generateOllamaJson).toHaveBeenCalledTimes(1);
  });

  it("repairs incomplete model experience entries from ordered source text", async () => {
    generateOllamaJson.mockResolvedValue({
      personalInfo: {
        fullName: "Nora Stein"
      },
      experiences: [
        {
          id: "exp-1",
          role: "",
          company: "",
          responsibilities: ["Leitung der Frontend-Entwicklung."],
          achievements: []
        },
        {
          id: "exp-2",
          responsibilities: ["Dispatch-Planung gebaut."],
          achievements: []
        }
      ],
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
      certificates: []
    });

    const response = await POST(
      createRequest({
        text: `Demo candidate context: Nora Stein

Professional experience:
2023-2026 Senior Frontend Engineer, Acme Health GmbH, Berlin
- Led frontend delivery.

2021-2023 Frontend Engineer, Northstar Logistics AG, Hamburg and remote
- Built dispatch planning tools.`,
        language: "de"
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data.experiences[0]).toMatchObject({
      role: "Senior Frontend Engineer",
      company: "Acme Health GmbH",
      location: "Berlin",
      startDate: "2023",
      endDate: "2026"
    });
    expect(payload.data.experiences[1]).toMatchObject({
      role: "Frontend Engineer",
      company: "Northstar Logistics AG",
      location: "Hamburg and remote",
      startDate: "2021",
      endDate: "2023"
    });
    expect(payload.data.experiences[0].responsibilities).toEqual([
      "Leitung der Frontend-Entwicklung."
    ]);
  });

  it("automatically raises the Ollama context window for long candidate text", async () => {
    generateOllamaJson.mockResolvedValue(validProfile);

    const response = await POST(
      createRequest({
        text: [sampleCandidateContext, sampleCandidateContext].join("\n\n"),
        language: "de"
      })
    );

    expect(response.status).toBe(200);
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.objectContaining({
        numCtx: expect.any(Number)
      }),
      { timeoutMs: 120_000 }
    );
    expect(
      (generateOllamaJson.mock.calls[0][0] as { numCtx: number }).numCtx
    ).toBeGreaterThan(8192);
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

  it("normalizes wrapped snake_case profile output with aliases and German language levels", async () => {
    generateOllamaJson.mockResolvedValue({
      candidate_profile: {
        personal_info: {
          full_name: "Nora Stein",
          email: "not-an-email",
          phone: "+49 30 1234567",
          linkedinUrl: "linkedin.com/in/nora-stein-demo"
        },
        profileSummary: "Frontend engineer for accessible product workflows.",
        work_experience: [
          {
            employer: "Acme Health GmbH",
            job_title: "Senior Frontend Engineer",
            start: 2023,
            end: "present",
            current: "yes",
            tasks: "Led frontend delivery; Built accessible forms",
            accomplishments: "Reduced user-reported form errors",
            tech_stack: "React, TypeScript, Next.js",
            confidence: "86"
          }
        ],
        education_history: {
          first: {
            school: "HTW Berlin",
            qualification: "B.Sc.",
            field_of_study: "Medieninformatik",
            start: 2017,
            end: 2021,
            subjects: "Human Computer Interaction; Web Engineering"
          }
        },
        skill_set: {
          technical_skills: "React, TypeScript",
          soft_skills: ["Mentoring"],
          platforms: "Figma, GitHub Actions",
          methodologies: "Design systems; Accessibility"
        },
        language_skills: "Deutsch Muttersprache; Englisch fließend",
        certifications: [
          "Professional Scrum Master I",
          {
            title: "AWS Cloud Practitioner Essentials",
            provider: "AWS",
            year: 2023
          }
        ],
        meta: {
          language: "de",
          uncertain_fields: "personalInfo.email",
          confidence: 75
        }
      }
    });

    const response = await POST(
      createRequest({ text: "Nora Stein profile.", language: "de" })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      personalInfo: {
        fullName: "Nora Stein",
        phone: "+49 30 1234567",
        linkedin: "linkedin.com/in/nora-stein-demo"
      },
      summary: "Frontend engineer for accessible product workflows.",
      experiences: [
        {
          company: "Acme Health GmbH",
          role: "Senior Frontend Engineer",
          startDate: "2023",
          endDate: "present",
          isCurrent: true,
          responsibilities: ["Led frontend delivery", "Built accessible forms"],
          achievements: ["Reduced user-reported form errors"],
          technologies: ["React", "TypeScript", "Next.js"],
          confidence: 0.86
        }
      ],
      education: [
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
        technical: ["React", "TypeScript"],
        soft: ["Mentoring"],
        tools: ["Figma", "GitHub Actions"],
        methods: ["Design systems", "Accessibility"]
      },
      languages: [
        {
          language: "Deutsch",
          proficiency: "native"
        },
        {
          language: "Englisch",
          proficiency: "fluent"
        }
      ],
      certificates: [
        {
          name: "Professional Scrum Master I"
        },
        {
          name: "AWS Cloud Practitioner Essentials",
          issuer: "AWS",
          issueDate: "2023"
        }
      ],
      extractionMeta: {
        language: "de",
        confidence: 0.75,
        uncertainFields: ["personalInfo.email"]
      }
    });
    expect(payload.data.personalInfo).not.toHaveProperty("email");
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
        numCtx: 8192,
        numPredict: 4096,
        think: false,
        temperature: 0.1
      }),
      { timeoutMs: 120_000 }
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
      { model: "granite4.1:3b-q6_K", timeoutMs: 120_000 }
    );
  });
});
