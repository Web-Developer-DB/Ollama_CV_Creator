import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractProfile,
  getAiStatus
} from "@/lib/api/ai-client";
import type { DesktopApi } from "@/types/electron";
import type { OllamaStatus } from "@/types/api";

type DesktopApiOverrides = {
  ai?: Partial<DesktopApi["ai"]>;
  storage?: Partial<DesktopApi["storage"]>;
};

const originalFetch = global.fetch;

const createDesktopApi = (overrides: DesktopApiOverrides): DesktopApi =>
  ({
    runtime: {
      platform: "linux",
      isElectron: true
    },
    ai: {
      status: vi.fn(),
      modelControl: vi.fn(),
      extractProfile: vi.fn(),
      analyzeJob: vi.fn(),
      generateCv: vi.fn(),
      generateCoverLetter: vi.fn(),
      ...overrides.ai
    },
    storage: {
      listProjects: vi.fn(),
      saveProject: vi.fn(),
      deleteProject: vi.fn(),
      ...overrides.storage
    }
  }) as unknown as DesktopApi;

const status: OllamaStatus = {
  baseUrl: "http://localhost:11434",
  configuredModel: "llama3.2",
  reachable: true,
  selectedModelAvailable: true,
  selectedModelLoaded: true,
  checkedAt: "2026-05-29T10:00:00.000Z",
  models: [],
  loadedModels: []
};

describe("AI client", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    delete window.desktopApi;
    vi.restoreAllMocks();
  });

  it("uses the desktop AI bridge when it is available", async () => {
    const statusResponse = { success: true, data: status };
    const statusMock = vi.fn().mockResolvedValue(statusResponse);
    window.desktopApi = createDesktopApi({
      ai: {
        status: statusMock
      }
    });
    global.fetch = vi.fn();

    await expect(getAiStatus("llama3.2")).resolves.toEqual(statusResponse);

    expect(statusMock).toHaveBeenCalledWith({ model: "llama3.2" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("keeps the web API fallback outside Electron", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: status }), {
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    await expect(getAiStatus("llama local")).resolves.toEqual({
      success: true,
      data: status
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai/status?model=llama%20local",
      { cache: "no-store" }
    );
  });

  it("routes profile extraction through the desktop bridge", async () => {
    const request = {
      text: "Candidate notes",
      language: "en" as const
    };
    const profileResponse = {
      success: true,
      data: {
        basics: {
          fullName: "Nora Stein",
          email: "nora@example.com",
          phone: "+49 123",
          location: "Berlin",
          links: []
        },
        summary: "Frontend engineer",
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        languages: [],
        uncertainFields: []
      }
    };
    const extractProfileMock = vi.fn().mockResolvedValue(profileResponse);
    window.desktopApi = createDesktopApi({
      ai: {
        extractProfile: extractProfileMock
      }
    });
    global.fetch = vi.fn();

    await expect(extractProfile(request)).resolves.toEqual(profileResponse);

    expect(extractProfileMock).toHaveBeenCalledWith(request);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
