import { describe, expect, it } from "vitest";
import type { ApiResponse } from "./api";
import type { GeneratedDocuments } from "./documents";
import type { JobAnalysis, JobTarget } from "./job";
import type { CandidateProfile } from "./profile";
import type { ApplicationProject, ProjectStatus } from "./project";
import type { DesignSettings } from "./templates";

describe("base domain types", () => {
  it("compose into an application project without runtime type imports", () => {
    const status: ProjectStatus = "draft";

    const candidateProfile = {
      personalInfo: { fullName: "Ada Lovelace" },
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
    } satisfies CandidateProfile;

    const jobTarget = {
      id: "job-1",
      jobDescription: "Build local-first web apps.",
      language: "en",
      tone: "professional"
    } satisfies JobTarget;

    const jobAnalysis = {
      requiredSkills: ["TypeScript"],
      optionalSkills: [],
      responsibilities: ["Build UI"],
      keywords: ["local-first"],
      softSkills: [],
      strengths: [],
      gaps: [],
      recommendations: []
    } satisfies JobAnalysis;

    const generatedDocuments = {} satisfies GeneratedDocuments;
    const designSettings = { template: "minimal" } satisfies DesignSettings;

    const project = {
      id: "project-1",
      title: "Application",
      status,
      createdAt: "2026-05-23T00:00:00.000Z",
      updatedAt: "2026-05-23T00:00:00.000Z",
      candidateProfile,
      jobTarget,
      jobAnalysis,
      generatedDocuments,
      designSettings
    } satisfies ApplicationProject;

    const response = { success: true, data: project } satisfies ApiResponse<
      ApplicationProject
    >;

    expect(response.data.title).toBe("Application");
  });
});
