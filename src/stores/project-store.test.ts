import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationProject } from "@/types/project";
import { useProjectStore } from "./project-store";

vi.mock("@/lib/storage/project-storage", () => {
  const projects = new Map<string, ApplicationProject>();

  return {
    deleteProject: vi.fn(async (id: string) => {
      projects.delete(id);
    }),
    getProject: vi.fn(async (id: string) => projects.get(id)),
    listProjects: vi.fn(async () => Array.from(projects.values())),
    saveProject: vi.fn(async (project: ApplicationProject) => {
      projects.set(project.id, project);
      return project;
    }),
    __resetStorage: () => projects.clear()
  };
});

const createProject = (id: string, title = "Application"): ApplicationProject => ({
  id,
  title,
  status: "draft",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z"
});

describe("project store", () => {
  beforeEach(async () => {
    const storage = await import("@/lib/storage/project-storage");
    (
      storage as typeof storage & {
        __resetStorage: () => void;
      }
    ).__resetStorage();
    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      isLoading: false,
      error: undefined,
      hasLoadedProjects: false
    });
  });

  it("saves and selects a project", async () => {
    const project = createProject("project-1");

    await useProjectStore.getState().saveProject(project);

    expect(useProjectStore.getState().projects).toEqual([project]);
    expect(useProjectStore.getState().selectedProjectId).toBe("project-1");
  });

  it("loads projects from storage", async () => {
    const project = createProject("project-1");
    await useProjectStore.getState().saveProject(project);
    useProjectStore.setState({ projects: [] });

    await useProjectStore.getState().loadProjects();

    expect(useProjectStore.getState().projects).toEqual([project]);
    expect(useProjectStore.getState().selectedProjectId).toBe("project-1");
    expect(useProjectStore.getState().hasLoadedProjects).toBe(true);
  });

  it("deletes a project and clears selection", async () => {
    const project = createProject("project-1");
    await useProjectStore.getState().saveProject(project);

    await useProjectStore.getState().deleteProject("project-1");

    expect(useProjectStore.getState().projects).toEqual([]);
    expect(useProjectStore.getState().selectedProjectId).toBeUndefined();
  });

  it("replaces older projects for single-user candidate imports", async () => {
    const firstProject = createProject("project-1", "First candidate");
    const secondProject = createProject("project-2", "Second candidate");
    const importedProject = createProject("project-3", "Imported candidate");

    await useProjectStore.getState().saveProject(firstProject);
    await useProjectStore.getState().saveProject(secondProject);
    await useProjectStore.getState().replaceProject(importedProject);

    expect(useProjectStore.getState().projects).toEqual([importedProject]);
    expect(useProjectStore.getState().selectedProjectId).toBe("project-3");

    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      hasLoadedProjects: false
    });

    await useProjectStore.getState().loadProjects();

    expect(useProjectStore.getState().projects).toEqual([importedProject]);
  });
});
