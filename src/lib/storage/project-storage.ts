// Renderer storage facade. It chooses Electron desktop storage when available
// and IndexedDB when running as a plain web app during development/tests.
import {
  deleteProject as deleteIndexedDbProject,
  listProjects as listIndexedDbProjects,
  saveProject as saveIndexedDbProject
} from "@/lib/storage/indexeddb";
import type {
  ApiResponse,
  ProjectJsonExportResult,
  ProjectJsonImportRequest,
  ProjectJsonImportResult,
  ProjectStorageLocation
} from "@/types/api";
import type { ApplicationProject } from "@/types/project";

const desktopApi = () =>
  typeof window === "undefined" ? undefined : window.desktopApi;

const unwrapDesktopResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.error?.message ?? "Desktop storage operation failed");
  }

  return response.data as T;
};

export const saveProject = async (
  project: ApplicationProject
): Promise<ApplicationProject> => {
  const api = desktopApi();

  if (api?.storage) {
    return unwrapDesktopResponse<ApplicationProject>(
      await api.storage.saveProject(project)
    );
  }

  return saveIndexedDbProject(project);
};

export const listProjects = async (): Promise<ApplicationProject[]> => {
  const api = desktopApi();

  if (api?.storage) {
    return unwrapDesktopResponse<ApplicationProject[]>(
      await api.storage.listProjects()
    );
  }

  return listIndexedDbProjects();
};

export const deleteProject = async (id: string): Promise<void> => {
  const api = desktopApi();

  if (api?.storage) {
    unwrapDesktopResponse<void>(await api.storage.deleteProject(id));
    return;
  }

  return deleteIndexedDbProject(id);
};

const requireDesktopStorage = () => {
  const api = desktopApi();

  if (!api?.storage) {
    throw new Error("Desktop project storage is not available");
  }

  return api.storage;
};

export const getProjectStorageLocation =
  async (): Promise<ProjectStorageLocation> =>
    unwrapDesktopResponse<ProjectStorageLocation>(
      await requireDesktopStorage().getLocation()
    );

export const exportProjectsJson = async (
  filePath: string
): Promise<ProjectJsonExportResult> =>
  unwrapDesktopResponse<ProjectJsonExportResult>(
    await requireDesktopStorage().exportProjectsJson(filePath)
  );

export const importProjectsJson = async (
  request: ProjectJsonImportRequest
): Promise<ProjectJsonImportResult> =>
  unwrapDesktopResponse<ProjectJsonImportResult>(
    await requireDesktopStorage().importProjectsJson(request)
  );
