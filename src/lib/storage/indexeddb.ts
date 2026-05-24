import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ApplicationProject } from "@/types/project";
import { applicationProjectSchema } from "@/lib/validation/schemas";

const DATABASE_NAME = "ollama-cv-creator";
const DATABASE_VERSION = 1;
const PROJECT_STORE_NAME = "projects";

type ProjectDatabase = DBSchema & {
  projects: {
    key: string;
    value: ApplicationProject;
    indexes: {
      "by-updated-at": string;
    };
  };
};

const openProjectDatabase = async (): Promise<IDBPDatabase<ProjectDatabase>> =>
  openDB<ProjectDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        const projectStore = database.createObjectStore(PROJECT_STORE_NAME, {
          keyPath: "id"
        });
        projectStore.createIndex("by-updated-at", "updatedAt");
      }
    }
  });

const validateProject = (project: ApplicationProject): ApplicationProject =>
  applicationProjectSchema.parse(project);

export const saveProject = async (
  project: ApplicationProject
): Promise<ApplicationProject> => {
  const validatedProject = validateProject(project);
  const database = await openProjectDatabase();

  try {
    await database.put(PROJECT_STORE_NAME, validatedProject);
    return validatedProject;
  } finally {
    database.close();
  }
};

export const getProject = async (
  id: string
): Promise<ApplicationProject | undefined> => {
  const database = await openProjectDatabase();

  try {
    const project = await database.get(PROJECT_STORE_NAME, id);
    return project ? validateProject(project) : undefined;
  } finally {
    database.close();
  }
};

export const listProjects = async (): Promise<ApplicationProject[]> => {
  const database = await openProjectDatabase();

  try {
    const projects = await database.getAll(PROJECT_STORE_NAME);
    return projects.map(validateProject);
  } finally {
    database.close();
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  const database = await openProjectDatabase();

  try {
    await database.delete(PROJECT_STORE_NAME, id);
  } finally {
    database.close();
  }
};
