const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");

const defaultHostname = "127.0.0.1";
const defaultPort = 3000;
const openDevTools = process.argv.includes("--devtools");

const processes = new Set();

const createElectronProcessEnv = () => {
  const safeEnv = { ...process.env };

  delete safeEnv.ELECTRON_RUN_AS_NODE;
  return safeEnv;
};

const spawnProcess = (command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });

  processes.add(child);
  child.on("exit", () => {
    processes.delete(child);
  });

  return child;
};

const stopAll = () => {
  for (const child of processes) {
    child.kill();
  }
};

const waitForRenderer = async (url, timeoutMs = 60_000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = await new Promise((resolve) => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve(response.statusCode !== undefined && response.statusCode < 500);
      });

      request.on("error", () => resolve(false));
      request.setTimeout(1_000, () => {
        request.destroy();
        resolve(false);
      });
    });

    if (ready) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  throw new Error(`Renderer did not start at ${url}`);
};

const canUsePort = (port, hostname) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, hostname);
  });

const findAvailablePort = async (startPort, hostname) => {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await canUsePort(port, hostname)) {
      return port;
    }
  }

  throw new Error(`No available renderer port found from ${startPort}`);
};

const resolveRendererConfig = async () => {
  if (process.env.ELECTRON_RENDERER_URL) {
    const rendererUrl = new URL(process.env.ELECTRON_RENDERER_URL);
    const hostname = rendererUrl.hostname || defaultHostname;
    const port = Number(rendererUrl.port || defaultPort);

    return {
      hostname,
      port,
      url: rendererUrl.toString()
    };
  }

  const hostname = process.env.ELECTRON_RENDERER_HOST || defaultHostname;
  const requestedPort = Number(
    process.env.ELECTRON_RENDERER_PORT || process.env.PORT || defaultPort
  );
  const port = await findAvailablePort(requestedPort, hostname);

  return {
    hostname,
    port,
    url: `http://${hostname}:${port}`
  };
};

const main = async () => {
  const renderer = await resolveRendererConfig();
  const nextProcess = spawnProcess(
    "npm",
    [
      "run",
      "dev:web",
      "--",
      "-H",
      renderer.hostname,
      "-p",
      String(renderer.port)
    ],
    {
      env: {
        ...process.env,
        ELECTRON_RENDERER_URL: renderer.url,
        HOSTNAME: renderer.hostname,
        PORT: String(renderer.port)
      }
    }
  );

  await waitForRenderer(renderer.url);

  const electronProcess = spawnProcess("npx", ["electron", "."], {
    env: {
      ...createElectronProcessEnv(),
      ELECTRON_OPEN_DEVTOOLS:
        openDevTools || process.env.ELECTRON_OPEN_DEVTOOLS === "1" ? "1" : "0",
      ELECTRON_RENDERER_URL: renderer.url
    }
  });

  electronProcess.on("exit", (code) => {
    stopAll();
    process.exit(code ?? 0);
  });

  nextProcess.on("exit", (code) => {
    stopAll();
    process.exit(code ?? 0);
  });
};

process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(143);
});

main().catch((error) => {
  console.error(error.message);
  stopAll();
  process.exit(1);
});
