import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteProject,
  listProjects,
  saveProject
} from "@/lib/storage/project-storage";
import type { DesktopApi } from "@/types/electron";
import type { ApplicationProject } from "@/types/project";

type DesktopApiOverrides = {
  ai?: Partial<DesktopApi["ai"]>;
  storage?: Partial<DesktopApi["storage"]>;
};

const createDesktopApi = (overrides: DesktopApiOverrides): DesktopApi =>
  ({
    runtime: {
      platform: "linux",
      isElectron: true
    },
    ai: {
      status: vi.fn(),
      modelControl: vi.fn(),
      extractProfile: vi.fn(),
      analyzeJob: vi.fn(),
      generateCv: vi.fn(),
      generateCoverLetter: vi.fn(),
      ...overrides.ai
    },
    storage: {
      listProjects: vi.fn(),
      saveProject: vi.fn(),
      deleteProject: vi.fn(),
      ...overrides.storage
    }
  }) as unknown as DesktopApi;

const project: ApplicationProject = {
  id: "project-1",
  title: "Desktop project",
  status: "draft",
  createdAt: "2026-05-29T10:00:00.000Z",
  updatedAt: "2026-05-29T10:00:00.000Z"
};

describe("project storage bridge", () => {
  afterEach(() => {
    delete window.desktopApi;
    vi.restoreAllMocks();
  });

  it("uses desktop storage when the bridge is available", async () => {
    const listProjectsMock = vi.fn().mockResolvedValue({
      success: true,
      data: [project]
    });
    const saveProjectMock = vi.fn().mockResolvedValue({
      success: true,
      data: project
    });
    const deleteProjectMock = vi.fn().mockResolvedValue({
      success: true
    });
    window.desktopApi = createDesktopApi({
      storage: {
        listProjects: listProjectsMock,
        saveProject: saveProjectMock,
        deleteProject: deleteProjectMock
      }
    });

    await expect(listProjects()).resolves.toEqual([project]);
    await expect(saveProject(project)).resolves.toEqual(project);
    await expect(deleteProject(project.id)).resolves.toBeUndefined();

    expect(listProjectsMock).toHaveBeenCalledOnce();
    expect(saveProjectMock).toHaveBeenCalledWith(project);
    expect(deleteProjectMock).toHaveBeenCalledWith(project.id);
  });

  it("surfaces desktop storage errors", async () => {
    window.desktopApi = createDesktopApi({
      storage: {
        listProjects: vi.fn().mockResolvedValue({
          success: false,
          error: {
            code: "EXPORT_FAILED",
            message: "Could not list projects"
          }
        })
      }
    });

    await expect(listProjects()).rejects.toThrow("Could not list projects");
  });
});
