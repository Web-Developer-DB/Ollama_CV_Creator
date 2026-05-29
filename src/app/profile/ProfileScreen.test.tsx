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

    await user.click(screen.getByRole("tab", { name: /Kontaktdaten/ }));

    const fullNameInput = screen.getByLabelText("Vollständiger Name");
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

    await userEvent.click(screen.getByRole("tab", { name: /Kontaktdaten/ }));

    expect(screen.getByLabelText("Vollständiger Name")).toHaveValue("");

    act(() => {
      useProjectStore.setState({
        projects: [projectWithProfile],
        selectedProjectId: projectWithProfile.id,
        isLoading: false,
        error: undefined
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Vollständiger Name")).toHaveValue("Ada Lovelace");
    });

    await userEvent.click(screen.getByRole("tab", { name: /Fähigkeiten/ }));
    expect(screen.getByLabelText("Technische Fähigkeit 1")).toHaveValue(
      "TypeScript"
    );

    await userEvent.click(screen.getByRole("tab", { name: /Erfahrung/ }));
    expect(screen.getByLabelText("Aufgaben")).toHaveValue("Built tools");
  });

  it("makes experiences editable", async () => {
    const user = userEvent.setup();

    render(<ProfileScreen />);

    await user.click(screen.getByRole("tab", { name: /Erfahrung/ }));

    const roleInput = screen.getByLabelText("Rolle");
    await user.clear(roleInput);
    await user.type(roleInput, "Principal Engineer");

    expect(roleInput).toHaveValue("Principal Engineer");
  });

  it("makes skills editable", async () => {
    const user = userEvent.setup();

    render(<ProfileScreen />);

    const technicalSkillsInput = screen.getByLabelText("Technische Fähigkeit 1");
    expect(technicalSkillsInput.tagName).toBe("INPUT");

    await user.clear(technicalSkillsInput);
    await user.type(technicalSkillsInput, "TypeScript Pro");

    expect(technicalSkillsInput).toHaveValue("TypeScript Pro");

    await user.type(screen.getByLabelText("Neue Technische Fähigkeit"), "React");
    await user.click(
      screen.getByRole("button", {
        name: "Technische Fähigkeit hinzufügen"
      })
    );

    expect(screen.getByLabelText("Technische Fähigkeit 2")).toHaveValue("React");
  });

  it("shows uncertain fields", async () => {
    const user = userEvent.setup();

    render(<ProfileScreen />);

    await user.click(screen.getByRole("tab", { name: /LLM-Hinweise/ }));

    expect(screen.getByText("Unsichere Felder")).toBeInTheDocument();
    expect(screen.getByText("experiences.0.startDate")).toBeInTheDocument();
    expect(screen.getByText("skills.tools")).toBeInTheDocument();
    expect(screen.getByText("Some dates were missing")).toBeInTheDocument();
  });

  it("shows a neutral extraction state when no uncertain fields exist", async () => {
    const user = userEvent.setup();

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

    await user.click(screen.getByRole("tab", { name: /LLM-Hinweise/ }));

    const neutralStatus = screen.getByText("Keine unsicheren Felder gemeldet.");
    const statusSection = neutralStatus.closest("section");

    expect(statusSection).not.toHaveClass("bg-amber-50");
  });
});
