import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAiStatus } from "@/lib/api/ai-client";
import { DashboardAiStatus } from "./DashboardAiStatus";

vi.mock("@/lib/api/ai-client", () => ({
  getAiStatus: vi.fn()
}));

const getAiStatusMock = vi.mocked(getAiStatus);

describe("DashboardAiStatus", () => {
  beforeEach(() => {
    getAiStatusMock.mockReset();
  });

  it("shows no loaded model when Ollama is reachable without loaded models", async () => {
    getAiStatusMock.mockResolvedValueOnce({
      success: true,
      data: {
        baseUrl: "http://127.0.0.1:11434",
        configuredModel: "granite4.1:3b-q6_K",
        reachable: true,
        selectedModelAvailable: true,
        selectedModelLoaded: false,
        checkedAt: "2026-05-29T21:38:36.000Z",
        models: [
          { name: "granite4.1:3b-q6_K", loaded: false },
          { name: "nemotron-3-nano:4b-q8_0", loaded: false }
        ],
        loadedModels: []
      }
    });

    render(<DashboardAiStatus />);

    expect(await screen.findByText("Kein Modell geladen")).toBeInTheDocument();
    expect(screen.getByText("0/2 geladen")).toBeInTheDocument();
    expect(screen.queryByText("Ollama bereit")).not.toBeInTheDocument();
  });

  it("shows ready only when at least one model is loaded", async () => {
    getAiStatusMock.mockResolvedValueOnce({
      success: true,
      data: {
        baseUrl: "http://127.0.0.1:11434",
        configuredModel: "nemotron-3-nano:4b-q8_0",
        reachable: true,
        selectedModelAvailable: true,
        selectedModelLoaded: true,
        checkedAt: "2026-05-29T21:38:36.000Z",
        models: [{ name: "nemotron-3-nano:4b-q8_0", loaded: true }],
        loadedModels: [{ name: "nemotron-3-nano:4b-q8_0" }]
      }
    });

    render(<DashboardAiStatus />);

    await waitFor(() => {
      expect(screen.getByText("Ollama bereit")).toBeInTheDocument();
    });
    expect(screen.getByText("Modell: nemotron-3-nano:4b-q8_0")).toBeInTheDocument();
  });
});
