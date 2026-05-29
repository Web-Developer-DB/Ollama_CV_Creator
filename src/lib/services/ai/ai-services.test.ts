import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeJob } from "@/lib/services/ai/analyze-job-service";
import { extractProfile } from "@/lib/services/ai/extract-profile-service";
import { generateCoverLetter } from "@/lib/services/ai/generate-cover-letter-service";
import { generateCv } from "@/lib/services/ai/generate-cv-service";
import type { GenerateCVRequest, GenerateCoverLetterRequest } from "@/types/api";
import type { GeneratedCV, GeneratedCoverLetter } from "@/types/documents";
import type { CandidateProfile } from "@/types/profile";

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

const candidateProfile: CandidateProfile = {
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
};

const cvRequest: GenerateCVRequest = {
  candidateProfile,
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

const coverLetterRequest: GenerateCoverLetterRequest = {
  ...cvRequest,
  jobAnalysis: {
    ...cvRequest.jobAnalysis,
    requiredSkills: ["React", "TypeScript", "Rust"],
    gaps: ["No Rust evidence"]
  },
  options: {
    language: "en",
    tone: "professional"
  }
};

const generatedCv: GeneratedCV = {
  id: "cv-1",
  title: "Frontend Engineer CV",
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
          bullets: ["React, Rust"]
        }
      ]
    }
  ],
  meta: {
    generatedAt: "2026-05-24T00:00:00.000Z"
  }
};

const generatedCoverLetter: GeneratedCoverLetter = {
  id: "cover-letter-1",
  language: "en",
  recipient: {
    company: "Target GmbH"
  },
  subject: "Application for Frontend Engineer at Target GmbH",
  greeting: "Dear hiring team,",
  opening: "I am applying for the Frontend Engineer role at Target GmbH.",
  body: [
    "My React, TypeScript and Rust background is a strong fit for Target GmbH."
  ],
  closing: "Sincerely,",
  signature: "Ada Lovelace",
  meta: {
    generatedAt: "2026-05-24T00:00:00.000Z"
  }
};

describe("AI services", () => {
  beforeEach(() => {
    generateOllamaJson.mockReset();
  });

  it("extracts profiles through a framework-independent service", async () => {
    generateOllamaJson.mockResolvedValue(candidateProfile);

    const payload = await extractProfile({
      text: "Ada writes TypeScript.",
      language: "en",
      model: selectedModel
    });

    expect(payload).toEqual({
      success: true,
      data: candidateProfile
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.1
      }),
      { model: selectedModel, timeoutMs: 120_000 }
    );
  });

  it("analyzes jobs through a framework-independent service", async () => {
    generateOllamaJson.mockResolvedValue({
      requiredSkills: ["React"],
      keywords: ["frontend"]
    });

    const payload = await analyzeJob({
      jobDescription: "Frontend role focused on React.",
      language: "en",
      model: selectedModel
    });

    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED"
      }
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.any(Object),
      { model: selectedModel }
    );
  });

  it("guards generated CVs against unsupported skills", async () => {
    generateOllamaJson.mockResolvedValue(generatedCv);

    const payload = await generateCv({
      ...cvRequest,
      model: selectedModel
    });

    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "HALLUCINATION_DETECTED"
      }
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.any(Object),
      { model: selectedModel }
    );
  });

  it("guards cover letters against unsupported job skills", async () => {
    generateOllamaJson.mockResolvedValue(generatedCoverLetter);

    const payload = await generateCoverLetter({
      ...coverLetterRequest,
      model: selectedModel
    });

    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "HALLUCINATION_DETECTED"
      }
    });
    expect(generateOllamaJson).toHaveBeenCalledWith(
      expect.any(Object),
      { model: selectedModel }
    );
  });
});
