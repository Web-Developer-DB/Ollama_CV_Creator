import { deleteDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApplicationProject } from "@/types/project";
import {
  deleteProject,
  getProject,
  listProjects,
  saveProject
} from "./indexeddb";

const createProject = (id: string, title = "Application"): ApplicationProject => ({
  id,
  title,
  status: "draft",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z"
});

describe("IndexedDB project storage", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
  });

  it("saves and loads a project", async () => {
    const project = createProject("project-1");

    await saveProject(project);

    await expect(getProject("project-1")).resolves.toEqual(project);
  });

  it("lists projects", async () => {
    await saveProject(createProject("project-1", "First"));
    await saveProject(createProject("project-2", "Second"));

    const projects = await listProjects();

    expect(projects.map((project) => project.title)).toEqual(["First", "Second"]);
  });

  it("deletes a project", async () => {
    await saveProject(createProject("project-1"));

    await deleteProject("project-1");

    await expect(getProject("project-1")).resolves.toBeUndefined();
  });
});
