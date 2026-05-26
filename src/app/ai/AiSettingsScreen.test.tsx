import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiSettingsScreen } from "./AiSettingsScreen";

const reachableStatus = {
  success: true,
  data: {
    baseUrl: "http://127.0.0.1:11434",
    configuredModel: "qwen3.5:4b",
    reachable: true,
    selectedModelAvailable: true,
    selectedModelLoaded: true,
    checkedAt: "2026-05-24T00:00:00.000Z",
    loadedModels: [
      {
        name: "qwen3.5:4b",
        size: 3_400_000_000,
        sizeVram: 3_100_000_000,
        expiresAt: "2026-05-24T00:05:00.000Z"
      }
    ],
    models: [
      {
        name: "qwen3.5:4b",
        loaded: true,
        size: 3_400_000_000,
        modifiedAt: "2026-05-22T12:00:00Z",
        parameterSize: "4B",
        quantizationLevel: "Q4_K_M"
      },
      {
        name: "llama3.2:3b",
        loaded: false,
        size: 2_000_000_000,
        modifiedAt: "2026-05-20T12:00:00Z"
      }
    ]
  }
};

const reachableWithoutModelsStatus = {
  success: true,
  data: {
    baseUrl: "http://127.0.0.1:11434",
    configuredModel: "qwen3.5:4b",
    reachable: true,
    selectedModelAvailable: false,
    selectedModelLoaded: false,
    checkedAt: "2026-05-24T00:00:00.000Z",
    loadedModels: [],
    models: []
  }
};

const reachableWithInstalledButUnloadedStatus = {
  success: true,
  data: {
    baseUrl: "http://127.0.0.1:11434",
    configuredModel: "qwen3.5:4b",
    reachable: true,
    selectedModelAvailable: true,
    selectedModelLoaded: false,
    checkedAt: "2026-05-24T00:00:00.000Z",
    loadedModels: [],
    models: [
      {
        name: "qwen3.5:4b",
        loaded: false,
        size: 3_400_000_000,
        modifiedAt: "2026-05-22T12:00:00Z",
        parameterSize: "4B",
        quantizationLevel: "Q4_K_M"
      }
    ]
  }
};

const reachableAfterUnloadStatus = {
  success: true,
  data: {
    ...reachableStatus.data,
    selectedModelLoaded: false,
    loadedModels: [],
    models: reachableStatus.data.models.map((model) => ({
      ...model,
      loaded: false
    }))
  }
};

describe("AiSettingsScreen", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
  });

  it("shows Ollama connection and selected model status", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(reachableStatus), { status: 200 })
    );

    render(<AiSettingsScreen />);

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("qwen3.5:4b")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("4B")).toBeInTheDocument();
  });

  it("unloads the selected model", async () => {
    const user = userEvent.setup();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(reachableStatus), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              action: "unload",
              model: "qwen3.5:4b"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(reachableAfterUnloadStatus), { status: 200 })
      );

    render(<AiSettingsScreen />);

    await screen.findByText("Connected");
    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(await screen.findByText("Model is unloaded")).toBeInTheDocument();
    expect(screen.getByText("No model loaded")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "/api/ai/model-control",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "unload",
          model: "qwen3.5:4b"
        })
      })
    );
  });

  it("loads the selected model", async () => {
    const user = userEvent.setup();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(reachableWithInstalledButUnloadedStatus), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              action: "load",
              model: "qwen3.5:4b"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(reachableStatus), { status: 200 })
      );

    render(<AiSettingsScreen />);

    await screen.findByText("No model loaded");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(await screen.findByText("Model is loaded")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "/api/ai/model-control",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "load",
          model: "qwen3.5:4b"
        })
      })
    );
  });

  it("allows selecting another installed model", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(reachableStatus), { status: 200 })
    );

    render(<AiSettingsScreen />);

    await screen.findByText("Connected");
    await user.selectOptions(screen.getByLabelText("Model"), "llama3.2:3b");

    expect(screen.getByLabelText("Model")).toHaveValue("llama3.2:3b");
    expect(screen.getByText("Selected locally")).toBeInTheDocument();
  });

  it("does not show connected when Ollama is reachable but no model is loaded", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(reachableWithInstalledButUnloadedStatus), {
        status: 200
      })
    );

    render(<AiSettingsScreen />);

    expect(await screen.findByText("No model loaded")).toBeInTheDocument();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    expect(screen.getByText("Reachable")).toBeInTheDocument();
    expect(screen.getByText("Not ready")).toBeInTheDocument();
  });

  it("shows when no model is installed", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(reachableWithoutModelsStatus), {
        status: 200
      })
    );

    render(<AiSettingsScreen />);

    expect(await screen.findByText("No model installed")).toBeInTheDocument();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
  });
});
