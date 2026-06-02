// Ollama cleanup helper. It attempts to unload local models when the desktop app
// exits so selected models do not keep running in the background.
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const parseTimeout = (value) => {
  const parsedValue = Number.parseInt(
    value ?? String(DEFAULT_SHUTDOWN_TIMEOUT_MS),
    10
  );

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_SHUTDOWN_TIMEOUT_MS;
};

const createTimeoutController = (timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeout)
  };
};

const isRecord = (value) => typeof value === "object" && value !== null;

const readModelName = (value) => {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = value.name ?? value.model;

  return typeof name === "string" && name.trim().length > 0
    ? name.trim()
    : undefined;
};

const collectModelNames = (body) => {
  const models = isRecord(body) && Array.isArray(body.models) ? body.models : [];

  return Array.from(
    new Set(
      models.flatMap((model) => {
        const name = readModelName(model);

        return name ? [name] : [];
      })
    )
  );
};

const resolveConfig = (options = {}) => ({
  baseUrl: trimTrailingSlash(
    options.baseUrl ??
      process.env.OLLAMA_BASE_URL ??
      DEFAULT_OLLAMA_BASE_URL
  ),
  timeoutMs: parseTimeout(
    options.timeoutMs ??
      process.env.OLLAMA_SHUTDOWN_TIMEOUT_MS ??
      process.env.OLLAMA_TIMEOUT_MS
  ),
  fetchImpl: options.fetchImpl ?? fetch
});

const fetchJson = async (url, init, timeoutMs, fetchImpl) => {
  const timeoutController = createTimeoutController(timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: timeoutController.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    timeoutController.cancel();
  }
};

const readLoadedModelNames = async ({ baseUrl, timeoutMs, fetchImpl }) => {
  const body = await fetchJson(
    `${baseUrl}/api/ps`,
    {
      method: "GET",
      cache: "no-store"
    },
    timeoutMs,
    fetchImpl
  );

  return collectModelNames(body);
};

const unloadModel = async ({ baseUrl, timeoutMs, fetchImpl, model }) => {
  await fetchJson(
    `${baseUrl}/api/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: "",
        stream: false,
        keep_alive: 0
      })
    },
    timeoutMs,
    fetchImpl
  );
};

const unloadLoadedOllamaModels = async (options = {}) => {
  const config = resolveConfig(options);
  const result = {
    attempted: false,
    loadedModels: [],
    unloadedModels: [],
    failedModels: [],
    error: undefined
  };

  try {
    result.loadedModels = await readLoadedModelNames(config);
  } catch (error) {
    return {
      ...result,
      error: error instanceof Error ? error.message : "Could not read models"
    };
  }

  if (result.loadedModels.length === 0) {
    return result;
  }

  result.attempted = true;

  for (const model of result.loadedModels) {
    try {
      await unloadModel({
        ...config,
        model
      });
      result.unloadedModels.push(model);
    } catch (error) {
      result.failedModels.push({
        model,
        error: error instanceof Error ? error.message : "Could not unload model"
      });
    }
  }

  return result;
};

module.exports = {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  collectModelNames,
  unloadLoadedOllamaModels
};
