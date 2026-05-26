import { deleteDB } from "idb";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import { ProfileScreen } from "./ProfileScreen";

const projectWithProfile: ApplicationProject = {
  id: "project-1",
  title: "Ada Lovelace",
  status: "profile_extracted",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
  candidateProfile: {
    personalInfo: {
      fullName: "Ada Lovelace",
      email: "ada@example.com"
    },
    summary: "Analytical engineer.",
    experiences: [
      {
        id: "exp-1",
        company: "Analytical Engines",
        role: "Engineer",
        responsibilities: ["Built tools"],
        achievements: [],
        confidence: 0.72
      }
    ],
    education: [],
    skills: {
      technical: ["TypeScript"],
      soft: ["Communication"],
      tools: [],
      languages: [],
      methods: []
    },
    projects: [],
    languages: [],
    certificates: [],
    extractionMeta: {
      language: "en",
      extractedAt: "2026-05-24T00:00:00.000Z",
      confidence: 0.8,
      uncertainFields: ["experiences.0.startDate", "skills.tools"],
      warnings: ["Some dates were missing"]
    }
  }
};

describe("ProfileScreen", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [projectWithProfile],
      selectedProjectId: projectWithProfile.id,
      isLoading: false,
      error: undefined
    });
  });

  it("makes personal info editable", async () => {
    const user = userEvent.setup();

    render(<ProfileScreen />);

    const fullNameInput = screen.getByLabelText("Full name");
    await user.clear(fullNameInput);
    await user.type(fullNameInput, "Ada Byron");

    expect(fullNameInput).toHaveValue("Ada Byron");
  });

  it("syncs the form when an extracted profile arrives after mount", async () => {
    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      isLoading: false,
      error: undefined
    });

    render(<ProfileScreen />);

    expect(screen.getByLabelText("Full name")).toHaveValue("");

    act(() => {
      useProjectStore.setState({
        projects: [projectWithProfile],
        selectedProjectId: projectWithProfile.id,
        isLoading: false,
        error: undefined
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
    });
    expect(screen.getByLabelText("Technical skills")).toHaveValue("TypeScript");
    expect(screen.getByLabelText("Responsibilities")).toHaveValue("Built tools");
  });

  it("makes experiences editable", async () => {
    const user = userEvent.setup();

    render(<ProfileScreen />);

    const roleInput = screen.getByLabelText("Experience role");
    await user.clear(roleInput);
    await user.type(roleInput, "Principal Engineer");

    expect(roleInput).toHaveValue("Principal Engineer");
  });

  it("makes skills editable", async () => {
    const user = userEvent.setup();

    render(<ProfileScreen />);

    const technicalSkillsInput = screen.getByLabelText("Technical skills");
    expect(technicalSkillsInput.tagName).toBe("TEXTAREA");

    await user.clear(technicalSkillsInput);
    await user.type(technicalSkillsInput, "TypeScript, React");

    expect(technicalSkillsInput).toHaveValue("TypeScript, React");
  });

  it("shows uncertain fields", () => {
    render(<ProfileScreen />);

    expect(screen.getByText("Uncertain fields")).toBeInTheDocument();
    expect(screen.getByText("experiences.0.startDate")).toBeInTheDocument();
    expect(screen.getByText("skills.tools")).toBeInTheDocument();
    expect(screen.getByText("Some dates were missing")).toBeInTheDocument();
  });

  it("shows a neutral extraction state when no uncertain fields exist", () => {
    useProjectStore.setState({
      projects: [
        {
          ...projectWithProfile,
          candidateProfile: {
            ...projectWithProfile.candidateProfile!,
            extractionMeta: {
              language: "en",
              uncertainFields: []
            }
          }
        }
      ],
      selectedProjectId: projectWithProfile.id
    });

    render(<ProfileScreen />);

    const neutralStatus = screen.getByText("No uncertain fields were reported.");
    const statusSection = neutralStatus.closest("section");

    expect(statusSection).toHaveClass("border-slate-200");
    expect(statusSection).not.toHaveClass("bg-amber-50");
  });
});
