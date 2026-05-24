import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationProject } from "@/types/project";
import { useProjectStore } from "./project-store";

vi.mock("@/lib/storage/indexeddb", () => {
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
    const storage = await import("@/lib/storage/indexeddb");
    (
      storage as typeof storage & {
        __resetStorage: () => void;
      }
    ).__resetStorage();
    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      isLoading: false,
      error: undefined
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
  });

  it("deletes a project and clears selection", async () => {
    const project = createProject("project-1");
    await useProjectStore.getState().saveProject(project);

    await useProjectStore.getState().deleteProject("project-1");

    expect(useProjectStore.getState().projects).toEqual([]);
    expect(useProjectStore.getState().selectedProjectId).toBeUndefined();
  });
});
