import { create } from "zustand";
import {
  deleteProject as deleteStoredProject,
  listProjects,
  saveProject as saveStoredProject
} from "@/lib/storage/indexeddb";
import type { ApplicationProject } from "@/types/project";

type ProjectStoreState = {
  projects: ApplicationProject[];
  selectedProjectId?: string;
  isLoading: boolean;
  error?: string;
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

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  selectedProjectId: undefined,
  isLoading: false,
  error: undefined,

  loadProjects: async () => {
    set({ isLoading: true, error: undefined });

    try {
      const projects = await listProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      set({ error: toErrorMessage(error), isLoading: false });
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
    }
  },

  selectProject: (id) => {
    set({ selectedProjectId: id });
  }
}));
