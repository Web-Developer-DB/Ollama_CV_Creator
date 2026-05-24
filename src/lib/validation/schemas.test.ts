import { describe, expect, it } from "vitest";
import { candidateProfileSchema, jobAnalysisSchema } from "./schemas";

const validProfile = {
  personalInfo: {
    fullName: "Ada Lovelace",
    email: "ada@example.com"
  },
  summary: "Builds reliable software systems.",
  experiences: [
    {
      id: "experience-1",
      company: "Analytical Engines Ltd",
      role: "Software Engineer",
      responsibilities: ["Built local-first interfaces"],
      achievements: ["Reduced manual review time"],
      confidence: 0.9
    }
  ],
  education: [],
  skills: {
    technical: ["TypeScript"],
    soft: ["Communication"],
    tools: [],
    languages: ["English"],
    methods: []
  },
  projects: [],
  languages: [],
  certificates: []
};

describe("validation schemas", () => {
  it("accepts a valid candidate profile", () => {
    const result = candidateProfileSchema.safeParse(validProfile);

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email address", () => {
    const result = candidateProfileSchema.safeParse({
      ...validProfile,
      personalInfo: {
        ...validProfile.personalInfo,
        email: "not-an-email"
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid match score", () => {
    const result = jobAnalysisSchema.safeParse({
      requiredSkills: [],
      optionalSkills: [],
      responsibilities: [],
      keywords: [],
      softSkills: [],
      matchScore: 101,
      strengths: [],
      gaps: [],
      recommendations: []
    });

    expect(result.success).toBe(false);
  });

  it("allows optional fields to be omitted", () => {
    const result = candidateProfileSchema.safeParse({
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
    });

    expect(result.success).toBe(true);
  });

  it("allows empty arrays", () => {
    const result = jobAnalysisSchema.safeParse({
      requiredSkills: [],
      optionalSkills: [],
      responsibilities: [],
      keywords: [],
      softSkills: [],
      strengths: [],
      gaps: [],
      recommendations: []
    });

    expect(result.success).toBe(true);
  });
});
