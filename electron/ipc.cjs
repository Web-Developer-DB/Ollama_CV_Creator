const { app, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { z } = require("zod");

const createSuccessResponse = (data) => ({
  success: true,
  data
});

const createErrorResponse = (code, message, details) => ({
  success: false,
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details })
  }
});

const languageSchema = z.enum(["de", "en"]);
const modelSchema = z.string().trim().min(1);
const modelQuerySchema = z
  .object({
    model: modelSchema.optional()
  })
  .optional();

const extractProfileRequestSchema = z.object({
  text: z.string().trim().min(1),
  language: languageSchema,
  model: modelSchema.optional()
});

const analyzeJobRequestSchema = z.object({
  jobDescription: z.string().trim().min(1),
  language: languageSchema
});

const modelControlRequestSchema = z.object({
  action: z.enum(["load", "unload"]),
  model: modelSchema
});

const generateCvRequestSchema = z.object({
  candidateProfile: z.record(z.string(), z.unknown()),
  jobTarget: z.record(z.string(), z.unknown()),
  jobAnalysis: z.record(z.string(), z.unknown()),
  options: z.object({
    language: languageSchema,
    length: z.literal("one_page"),
    style: z.enum(["modern", "classic", "minimal"])
  })
});

const generateCoverLetterRequestSchema = z.object({
  candidateProfile: z.record(z.string(), z.unknown()),
  jobTarget: z.record(z.string(), z.unknown()),
  jobAnalysis: z.record(z.string(), z.unknown()),
  options: z.object({
    language: languageSchema,
    tone: z.enum(["professional", "modern", "conservative", "confident"])
  })
});

const projectSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    status: z.enum([
      "draft",
      "text_imported",
      "profile_extracted",
      "profile_reviewed",
      "job_imported",
      "job_analyzed",
      "documents_generated",
      "template_selected",
      "export_ready"
    ]),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1)
  })
  .passthrough();

const projectIdSchema = z.string().trim().min(1);

const storageFilePath = () =>
  path.join(app.getPath("userData"), "projects.json");

const ensureStorageDirectory = async () => {
  await fs.mkdir(path.dirname(storageFilePath()), { recursive: true });
};

const readStoredProjects = async () => {
  try {
    const rawValue = await fs.readFile(storageFilePath(), "utf8");
    const parsedValue = JSON.parse(rawValue);
    const parsedProjects = z.array(projectSchema).safeParse(parsedValue);

    return parsedProjects.success ? parsedProjects.data : [];
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

const writeStoredProjects = async (projects) => {
  await ensureStorageDirectory();
  await fs.writeFile(storageFilePath(), JSON.stringify(projects, null, 2), "utf8");
};

const createValidatedHandler =
  (schema, handler) =>
  async (_event, input) => {
    const parsedInput = schema.safeParse(input);

    if (!parsedInput.success) {
      return createErrorResponse(
        "INVALID_INPUT",
        "IPC payload did not match the expected schema",
        parsedInput.error.flatten()
      );
    }

    try {
      return await handler(parsedInput.data);
    } catch {
      return createErrorResponse("EXPORT_FAILED", "Desktop operation failed");
    }
  };

const proxyJsonRoute = async (rendererUrl, route, payload) => {
  const response = await fetch(new URL(route, rendererUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return response.json();
};

const proxyStatusRoute = async (rendererUrl, input = {}) => {
  const url = new URL("/api/ai/status", rendererUrl);

  if (input.model) {
    url.searchParams.set("model", input.model);
  }

  const response = await fetch(url, {
    cache: "no-store"
  });

  return response.json();
};

const saveProject = async (project) => {
  const projects = await readStoredProjects();
  const existingIndex = projects.findIndex(
    (currentProject) => currentProject.id === project.id
  );
  const nextProjects =
    existingIndex >= 0
      ? projects.map((currentProject) =>
          currentProject.id === project.id ? project : currentProject
        )
      : [...projects, project];

  await writeStoredProjects(nextProjects);

  return createSuccessResponse(project);
};

const listProjects = async () => createSuccessResponse(await readStoredProjects());

const deleteProject = async (id) => {
  const projects = await readStoredProjects();
  await writeStoredProjects(
    projects.filter((currentProject) => currentProject.id !== id)
  );

  return createSuccessResponse(undefined);
};

const registerIpcHandlers = ({ rendererUrl }) => {
  ipcMain.handle(
    "ai:status",
    createValidatedHandler(modelQuerySchema, (input) =>
      proxyStatusRoute(rendererUrl, input)
    )
  );
  ipcMain.handle(
    "ai:model-control",
    createValidatedHandler(modelControlRequestSchema, (input) =>
      proxyJsonRoute(rendererUrl, "/api/ai/model-control", input)
    )
  );
  ipcMain.handle(
    "ai:extract-profile",
    createValidatedHandler(extractProfileRequestSchema, (input) =>
      proxyJsonRoute(rendererUrl, "/api/ai/extract-profile", input)
    )
  );
  ipcMain.handle(
    "ai:analyze-job",
    createValidatedHandler(analyzeJobRequestSchema, (input) =>
      proxyJsonRoute(rendererUrl, "/api/ai/analyze-job", input)
    )
  );
  ipcMain.handle(
    "ai:generate-cv",
    createValidatedHandler(generateCvRequestSchema, (input) =>
      proxyJsonRoute(rendererUrl, "/api/ai/generate-cv", input)
    )
  );
  ipcMain.handle(
    "ai:generate-cover-letter",
    createValidatedHandler(generateCoverLetterRequestSchema, (input) =>
      proxyJsonRoute(rendererUrl, "/api/ai/generate-cover-letter", input)
    )
  );

  ipcMain.handle("storage:list-projects", async () => {
    try {
      return await listProjects();
    } catch {
      return createErrorResponse("EXPORT_FAILED", "Could not list projects");
    }
  });
  ipcMain.handle(
    "storage:save-project",
    createValidatedHandler(projectSchema, saveProject)
  );
  ipcMain.handle(
    "storage:delete-project",
    createValidatedHandler(projectIdSchema, deleteProject)
  );
};

module.exports = {
  registerIpcHandlers
};
