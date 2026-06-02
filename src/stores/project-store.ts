// Zustand store for local project selection and persistence lifecycle. Screens
// call this store instead of talking to storage adapters directly.
import { create } from "zustand";
import {
  deleteProject as deleteStoredProject,
  listProjects,
  saveProject as saveStoredProject
} from "@/lib/storage/project-storage";
import type { ApplicationProject } from "@/types/project";

type ProjectStoreState = {
  projects: ApplicationProject[];
  selectedProjectId?: string;
  isLoading: boolean;
  error?: string;
  hasLoadedProjects: boolean;
};

type ProjectStoreActions = {
  loadProjects: () => Promise<void>;
  saveProject: (project: ApplicationProject) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string | undefined) => void;
};

export type ProjectStore = ProjectStoreState & ProjectStoreActions;

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Storage operation failed";

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  selectedProjectId: undefined,
  isLoading: false,
  error: undefined,
  hasLoadedProjects: false,

  loadProjects: async () => {
    if (get().hasLoadedProjects) {
      return;
    }

    set({ isLoading: true, error: undefined });

    try {
      const projects = await listProjects();
      const currentSelectedProjectId = get().selectedProjectId;
      const selectedProjectStillExists = projects.some(
        (project) => project.id === currentSelectedProjectId
      );

      set({
        projects,
        selectedProjectId: selectedProjectStillExists
          ? currentSelectedProjectId
          : projects[0]?.id,
        isLoading: false,
        hasLoadedProjects: true
      });
    } catch (error) {
      set({
        error: toErrorMessage(error),
        isLoading: false,
        hasLoadedProjects: true
      });
    }
  },

  saveProject: async (project) => {
    set({ isLoading: true, error: undefined });

    try {
      const savedProject = await saveStoredProject(project);
      set((state) => {
        const existingIndex = state.projects.findIndex(
          (currentProject) => currentProject.id === savedProject.id
        );
        const projects =
          existingIndex >= 0
            ? state.projects.map((currentProject) =>
                currentProject.id === savedProject.id
                  ? savedProject
                  : currentProject
              )
            : [...state.projects, savedProject];

        return {
          projects,
          selectedProjectId: savedProject.id,
          isLoading: false
        };
      });
    } catch (error) {
      set({ error: toErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: undefined });

    try {
      await deleteStoredProject(id);
      set((state) => ({
        projects: state.projects.filter((project) => project.id !== id),
        selectedProjectId:
          state.selectedProjectId === id ? undefined : state.selectedProjectId,
        isLoading: false
      }));
    } catch (error) {
      set({ error: toErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  selectProject: (id) => {
    set({ selectedProjectId: id });
  }
}));
