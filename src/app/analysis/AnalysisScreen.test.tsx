import { deleteDB } from "idb";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import { AnalysisScreen } from "./AnalysisScreen";

const projectWithAnalysis: ApplicationProject = {
  id: "project-1",
  title: "Frontend Engineer at Acme",
  status: "job_analyzed",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
  jobTarget: {
    id: "job-1",
    title: "Frontend Engineer",
    company: "Acme GmbH",
    jobDescription: "Build accessible React applications.",
    language: "en",
    tone: "professional"
  },
  jobAnalysis: {
    requiredSkills: ["React", "TypeScript"],
    optionalSkills: ["Next.js"],
    responsibilities: ["Build accessible user interfaces"],
    keywords: ["frontend", "accessibility"],
    softSkills: ["Collaboration"],
    matchScore: 82,
    strengths: ["Strong React background"],
    gaps: ["Limited GraphQL evidence"],
    recommendations: ["Emphasize accessibility projects"]
  }
};

describe("AnalysisScreen", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [projectWithAnalysis],
      selectedProjectId: projectWithAnalysis.id,
      isLoading: false,
      error: undefined
    });
  });

  it("renders the match score", () => {
    render(<AnalysisScreen />);

    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("renders strengths", () => {
    render(<AnalysisScreen />);

    expect(screen.getByText("Strong React background")).toBeInTheDocument();
  });

  it("renders gaps", () => {
    render(<AnalysisScreen />);

    expect(screen.getByText("Limited GraphQL evidence")).toBeInTheDocument();
  });

  it("renders recommendations", () => {
    render(<AnalysisScreen />);

    expect(screen.getByText("Emphasize accessibility projects")).toBeInTheDocument();
  });
});
