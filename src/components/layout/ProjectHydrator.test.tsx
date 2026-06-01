import { deleteDB } from "idb";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { saveProject as saveStoredProject } from "@/lib/storage/project-storage";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import { AppShell } from "./AppShell";

const storedProfileProject: ApplicationProject = {
  id: "project-profile",
  title: "Stored Candidate",
  status: "profile_extracted",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  candidateProfile: {
    personalInfo: {
      fullName: "Stored Candidate"
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
  }
};

describe("ProjectHydrator", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      isLoading: false,
      error: undefined,
      hasLoadedProjects: false
    });
  });

  it("loads stored profile projects when the app shell mounts", async () => {
    await saveStoredProject(storedProfileProject);

    render(
      <AppShell title="Dashboard">
        <p>Dashboard content</p>
      </AppShell>
    );

    await waitFor(() => {
      expect(useProjectStore.getState().projects).toEqual([
        storedProfileProject
      ]);
    });
    expect(useProjectStore.getState().selectedProjectId).toBe("project-profile");
    expect(useProjectStore.getState().hasLoadedProjects).toBe(true);
  });
});
