// Desktop project storage service. It owns the local JSON project database and
// import/export helpers used through the Electron IPC bridge.
const fs = require("node:fs/promises");
const path = require("node:path");
const { z } = require("zod");

const projectStatusSchema = z.enum([
  "draft",
  "text_imported",
  "profile_extracted",
  "profile_reviewed",
  "job_imported",
  "job_analyzed",
  "documents_generated",
  "template_selected",
  "export_ready"
]);

const projectSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    status: projectStatusSchema,
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1)
  })
  .passthrough();

const projectArraySchema = z.array(projectSchema);

const normalizeStorageFilePath = ({ app, storageFilePath }) =>
  storageFilePath ?? path.join(app.getPath("userData"), "projects.json");

const ensureParentDirectory = async (filePath, fsImpl) => {
  await fsImpl.mkdir(path.dirname(filePath), { recursive: true });
};

const readJsonFile = async (filePath, fsImpl) => {
  const rawValue = await fsImpl.readFile(filePath, "utf8");

  return JSON.parse(rawValue);
};

const writeJsonFile = async (filePath, value, fsImpl) => {
  await ensureParentDirectory(filePath, fsImpl);
  await fsImpl.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const createCorruptStorageFilePath = (filePath) =>
  `${filePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const archiveCorruptStorageFile = async (filePath, fsImpl) => {
  const corruptFilePath = createCorruptStorageFilePath(filePath);

  try {
    await fsImpl.rename(filePath, corruptFilePath);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  return corruptFilePath;
};

const isRecoverableProjectFileError = (error) =>
  error instanceof SyntaxError || error instanceof z.ZodError;

const mergeProjects = (existingProjects, importedProjects) => {
  const projectsById = new Map();

  for (const project of existingProjects) {
    projectsById.set(project.id, project);
  }

  for (const project of importedProjects) {
    projectsById.set(project.id, project);
  }

  return Array.from(projectsById.values());
};

const createProjectStorage = ({
  app,
  fsImpl = fs,
  storageFilePath
}) => {
  const resolvedStorageFilePath = normalizeStorageFilePath({
    app,
    storageFilePath
  });

  const listProjects = async () => {
    try {
      const parsedValue = await readJsonFile(resolvedStorageFilePath, fsImpl);

      return projectArraySchema.parse(parsedValue);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return [];
      }

      if (isRecoverableProjectFileError(error)) {
        await archiveCorruptStorageFile(resolvedStorageFilePath, fsImpl);

        return [];
      }

      throw error;
    }
  };

  const writeProjects = async (projects) => {
    const validatedProjects = projectArraySchema.parse(projects);

    await writeJsonFile(resolvedStorageFilePath, validatedProjects, fsImpl);

    return validatedProjects;
  };

  const saveProject = async (project) => {
    const validatedProject = projectSchema.parse(project);
    const projects = await listProjects();
    const existingIndex = projects.findIndex(
      (currentProject) => currentProject.id === validatedProject.id
    );
    const nextProjects =
      existingIndex >= 0
        ? projects.map((currentProject) =>
            currentProject.id === validatedProject.id
              ? validatedProject
              : currentProject
          )
        : [...projects, validatedProject];

    await writeProjects(nextProjects);

    return validatedProject;
  };

  const getProject = async (id) => {
    const projects = await listProjects();

    return projects.find((project) => project.id === id);
  };

  const deleteProject = async (id) => {
    const projects = await listProjects();

    await writeProjects(projects.filter((project) => project.id !== id));
  };

  const exportProjectsJson = async (filePath) => {
    const projects = await listProjects();

    await writeJsonFile(filePath, projects, fsImpl);

    return {
      filePath,
      projectCount: projects.length
    };
  };

  const importProjectsJson = async (filePath, options = {}) => {
    const importedProjects = projectArraySchema.parse(
      await readJsonFile(filePath, fsImpl)
    );
    const currentProjects = options.mode === "replace" ? [] : await listProjects();
    const nextProjects = mergeProjects(currentProjects, importedProjects);

    await writeProjects(nextProjects);

    return {
      filePath,
      importedCount: importedProjects.length,
      totalCount: nextProjects.length
    };
  };

  return {
    storageFilePath: () => resolvedStorageFilePath,
    listProjects,
    getProject,
    saveProject,
    deleteProject,
    exportProjectsJson,
    importProjectsJson
  };
};

module.exports = {
  createProjectStorage,
  projectSchema
};
