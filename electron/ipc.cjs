const { app, ipcMain } = require("electron");
const { z } = require("zod");
const {
  createProjectStorage,
  projectSchema
} = require("./project-storage.cjs");

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
const templateStyleSchema = z.enum([
  "modern",
  "classic",
  "minimal",
  "executive",
  "technical",
  "compact"
]);
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
  language: languageSchema,
  model: modelSchema.optional()
});

const modelControlRequestSchema = z.object({
  action: z.enum(["load", "unload"]),
  model: modelSchema
});

const generateCvRequestSchema = z.object({
  candidateProfile: z.record(z.string(), z.unknown()),
  jobTarget: z.record(z.string(), z.unknown()),
  jobAnalysis: z.record(z.string(), z.unknown()),
  model: modelSchema.optional(),
  options: z.object({
    language: languageSchema,
    length: z.literal("one_page"),
    style: templateStyleSchema
  })
});

const generateCoverLetterRequestSchema = z.object({
  candidateProfile: z.record(z.string(), z.unknown()),
  jobTarget: z.record(z.string(), z.unknown()),
  jobAnalysis: z.record(z.string(), z.unknown()),
  model: modelSchema.optional(),
  options: z.object({
    language: languageSchema,
    tone: z.enum(["professional", "modern", "conservative", "confident"])
  })
});

const projectIdSchema = z.string().trim().min(1);
const projectJsonPathSchema = z.string().trim().min(1);
const projectJsonImportRequestSchema = z.object({
  filePath: projectJsonPathSchema,
  mode: z.enum(["merge", "replace"]).optional()
});

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

const registerIpcHandlers = ({ rendererUrl }) => {
  const projectStorage = createProjectStorage({ app });

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
      return createSuccessResponse(await projectStorage.listProjects());
    } catch {
      return createErrorResponse("EXPORT_FAILED", "Could not list projects");
    }
  });
  ipcMain.handle(
    "storage:save-project",
    createValidatedHandler(projectSchema, async (project) =>
      createSuccessResponse(await projectStorage.saveProject(project))
    )
  );
  ipcMain.handle(
    "storage:delete-project",
    createValidatedHandler(projectIdSchema, async (id) => {
      await projectStorage.deleteProject(id);

      return createSuccessResponse(undefined);
    })
  );
  ipcMain.handle("storage:get-location", async () =>
    createSuccessResponse({
      filePath: projectStorage.storageFilePath()
    })
  );
  ipcMain.handle(
    "storage:export-projects-json",
    createValidatedHandler(projectJsonPathSchema, async (filePath) =>
      createSuccessResponse(await projectStorage.exportProjectsJson(filePath))
    )
  );
  ipcMain.handle(
    "storage:import-projects-json",
    createValidatedHandler(projectJsonImportRequestSchema, async (input) =>
      createSuccessResponse(
        await projectStorage.importProjectsJson(input.filePath, {
          mode: input.mode
        })
      )
    )
  );
};

module.exports = {
  registerIpcHandlers
};
