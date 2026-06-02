import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import storageModule from "./project-storage.cjs";

const { createProjectStorage } = storageModule;

const createApp = (userDataPath) => ({
  getPath: (name) => {
    if (name !== "userData") {
      throw new Error(`Unexpected path request: ${name}`);
    }

    return userDataPath;
  }
});

const createProject = (id, title = "Application") => ({
  id,
  title,
  status: "draft",
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z"
});

describe("desktop project storage", () => {
  let tempDirectory;
  let storage;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(os.tmpdir(), "ollama-cv-storage-"));
    storage = createProjectStorage({
      app: createApp(tempDirectory)
    });
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it("uses a deterministic project file inside Electron userData", () => {
    expect(storage.storageFilePath()).toBe(
      path.join(tempDirectory, "projects.json")
    );
  });

  it("saves and loads a project", async () => {
    const project = createProject("project-1");

    await expect(storage.saveProject(project)).resolves.toEqual(project);
    await expect(storage.getProject("project-1")).resolves.toEqual(project);
  });

  it("lists projects in stored order", async () => {
    await storage.saveProject(createProject("project-1", "First"));
    await storage.saveProject(createProject("project-2", "Second"));

    await expect(storage.listProjects()).resolves.toEqual([
      createProject("project-1", "First"),
      createProject("project-2", "Second")
    ]);
  });

  it("updates an existing project by id", async () => {
    await storage.saveProject(createProject("project-1", "First"));
    await storage.saveProject(createProject("project-1", "Updated"));

    await expect(storage.listProjects()).resolves.toEqual([
      createProject("project-1", "Updated")
    ]);
  });

  it("deletes a project", async () => {
    await storage.saveProject(createProject("project-1"));
    await storage.deleteProject("project-1");

    await expect(storage.getProject("project-1")).resolves.toBeUndefined();
  });

  it("exports and imports project JSON", async () => {
    const exportPath = path.join(tempDirectory, "backup", "projects.json");

    await storage.saveProject(createProject("project-1", "First"));

    await expect(storage.exportProjectsJson(exportPath)).resolves.toEqual({
      filePath: exportPath,
      projectCount: 1
    });
    await storage.deleteProject("project-1");
    await expect(
      storage.importProjectsJson(exportPath, { mode: "merge" })
    ).resolves.toEqual({
      filePath: exportPath,
      importedCount: 1,
      totalCount: 1
    });
    await expect(storage.listProjects()).resolves.toEqual([
      createProject("project-1", "First")
    ]);
  });

  it("replaces projects during JSON import when requested", async () => {
    const importPath = path.join(tempDirectory, "import.json");

    await storage.saveProject(createProject("existing-project", "Existing"));
    await storage.exportProjectsJson(importPath);
    await storage.saveProject(createProject("temporary-project", "Temporary"));

    await storage.importProjectsJson(importPath, { mode: "replace" });

    await expect(storage.listProjects()).resolves.toEqual([
      createProject("existing-project", "Existing")
    ]);
    await expect(readFile(storage.storageFilePath(), "utf8")).resolves.toContain(
      "Existing"
    );
  });

  it("archives corrupt project JSON and starts with an empty list", async () => {
    const corruptContent = `${JSON.stringify([
      createProject("project-1", "First")
    ])}\ntrailing broken fragment`;

    await writeFile(storage.storageFilePath(), corruptContent, "utf8");

    await expect(storage.listProjects()).resolves.toEqual([]);

    const files = await readdir(tempDirectory);
    const corruptFiles = files.filter((fileName) =>
      fileName.startsWith("projects.json.corrupt-")
    );

    expect(corruptFiles).toHaveLength(1);
    await expect(
      readFile(path.join(tempDirectory, corruptFiles[0]), "utf8")
    ).resolves.toBe(corruptContent);

    await storage.saveProject(createProject("project-2", "Recovered"));

    await expect(storage.listProjects()).resolves.toEqual([
      createProject("project-2", "Recovered")
    ]);
  });
});
