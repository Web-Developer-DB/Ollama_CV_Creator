import { deleteDB } from "idb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listProjects as listIndexedProjects,
  saveProject as saveIndexedProject
} from "@/lib/storage/indexeddb";
import { useProjectStore } from "@/stores/project-store";
import type { CandidateProfile } from "@/types/profile";
import type { ApplicationProject } from "@/types/project";
import { ImportScreen } from "./ImportScreen";

const createCandidateProfile = (fullName: string): CandidateProfile => ({
  personalInfo: {
    fullName
  },
  experiences: [],
  education: [],
  skills: {
    technical: [],
    soft: [],
    tools: [],
    languages: [],
    methods: []
  },
  projects: [],
  languages: [],
  certificates: []
});

const createProject = (
  id: string,
  title: string,
  candidateProfile?: CandidateProfile
): ApplicationProject => ({
  id,
  title,
  status: candidateProfile ? "profile_extracted" : "text_imported",
  createdAt: "2026-05-25T10:00:00.000Z",
  updatedAt: "2026-05-25T10:00:00.000Z",
  rawInput: {
    id: `${id}-raw`,
    sourceType: "manual_text",
    text: `${title} raw context`,
    language: "de",
    createdAt: "2026-05-25T10:00:00.000Z"
  },
  candidateProfile,
  jobTarget: candidateProfile
    ? {
        id: `${id}-job`,
        title: "Frontend Engineer",
        company: "Old Company",
        jobDescription: "Old target role",
        language: "de",
        tone: "professional"
      }
    : undefined,
  generatedDocuments: candidateProfile
    ? {
        cv: {
          id: `${id}-cv`,
          language: "de",
          sections: [],
          meta: {
            generatedAt: "2026-05-25T10:00:00.000Z"
          }
        }
      }
    : undefined
});

const createReadyAiStatusResponse = (): Response =>
  new Response(
    JSON.stringify({
      success: true,
      data: {
        baseUrl: "http://127.0.0.1:11434",
        configuredModel: "qwen3.5:4b",
        reachable: true,
        selectedModelAvailable: true,
        selectedModelLoaded: true,
        checkedAt: "2026-05-25T12:00:00.000Z",
        models: [{ name: "qwen3.5:4b", loaded: true }],
        loadedModels: [{ name: "qwen3.5:4b" }]
      }
    }),
    { status: 200 }
  );

describe("ImportScreen", () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      isLoading: false,
      error: undefined,
      hasLoadedProjects: true
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
  });

  it("starts with demo candidate context for first-time users", () => {
    render(<ImportScreen />);

    expect(
      (screen.getByLabelText("Candidate context") as HTMLTextAreaElement).value
    ).toContain("Nora Stein");
    expect(
      screen.getByRole("button", { name: "Extract profile" })
    ).toBeEnabled();
  });

  it("accepts raw text entry", async () => {
    const user = userEvent.setup();

    render(<ImportScreen />);

    const textArea = screen.getByLabelText("Candidate context");
    await user.clear(textArea);
    await user.type(textArea, "Ada writes TypeScript and React applications.");

    expect(textArea).toHaveValue("Ada writes TypeScript and React applications.");
  });

  it("selects a language", async () => {
    const user = userEvent.setup();

    render(<ImportScreen />);

    const languageSelect = screen.getByLabelText("Language");
    await user.selectOptions(languageSelect, "en");

    expect(languageSelect).toHaveValue("en");
  });

  it("saves raw input to the project store", async () => {
    const user = userEvent.setup();

    render(<ImportScreen />);

    await user.clear(screen.getByLabelText("Candidate context"));
    await user.type(
      screen.getByLabelText("Candidate context"),
      "Ada Lovelace, Software Engineer, TypeScript, Berlin"
    );
    await user.selectOptions(screen.getByLabelText("Language"), "en");
    await user.click(screen.getByRole("button", { name: "Save context" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project).toMatchObject({
        status: "text_imported",
        rawInput: {
          sourceType: "manual_text",
          text: "Ada Lovelace, Software Engineer, TypeScript, Berlin",
          language: "en"
        }
      });
    });
  });

  it("extracts a candidate profile from the current context", async () => {
    const user = userEvent.setup();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(createReadyAiStatusResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              personalInfo: {
                fullName: "Nora Stein",
                email: "nora.stein@example.com",
                location: "Berlin"
              },
              summary: "Frontend engineer focused on design systems.",
              experiences: [
                {
                  id: "exp-1",
                  role: "Senior Frontend Engineer",
                  company: "Acme Health GmbH",
                  responsibilities: ["Built accessible React components"],
                  achievements: []
                }
              ],
              education: [],
              skills: {
                technical: ["TypeScript", "React"],
                soft: ["Communication"],
                tools: ["Figma"],
                languages: ["German", "English"],
                methods: ["Design systems"]
              },
              projects: [],
              languages: [],
              certificates: [],
              extractionMeta: {
                language: "de",
                uncertainFields: []
              }
            }
          }),
          { status: 200 }
        )
      );

    render(<ImportScreen />);

    await user.click(screen.getByRole("button", { name: "Extract profile" }));

    await waitFor(() => {
      const projects = useProjectStore.getState().projects;
      const [project] = projects;

      expect(projects).toHaveLength(1);
      expect(project).toMatchObject({
        status: "profile_extracted",
        candidateProfile: {
          personalInfo: {
            fullName: "Nora Stein"
          }
        }
      });
    });
    expect(screen.getByText(/Profile extracted/)).toBeInTheDocument();
  });

  it("overwrites older candidate projects when extracting a new profile", async () => {
    const user = userEvent.setup();
    const oldProject = createProject(
      "project-old",
      "Nora Stein",
      createCandidateProfile("Nora Stein")
    );
    const staleProject = createProject(
      "project-stale",
      "Max Mustermann",
      createCandidateProfile("Max Mustermann")
    );

    await saveIndexedProject(oldProject);
    await saveIndexedProject(staleProject);
    useProjectStore.setState({
      projects: [oldProject, staleProject],
      selectedProjectId: oldProject.id,
      hasLoadedProjects: true
    });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(createReadyAiStatusResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: createCandidateProfile("Ada Lovelace")
          }),
          { status: 200 }
        )
      );

    render(<ImportScreen />);

    await user.clear(screen.getByLabelText("Candidate context"));
    await user.type(
      screen.getByLabelText("Candidate context"),
      "Ada Lovelace, Software Engineer, TypeScript, London"
    );
    await user.click(screen.getByRole("button", { name: "Extract profile" }));

    await waitFor(() => {
      const projects = useProjectStore.getState().projects;

      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        id: oldProject.id,
        status: "profile_extracted",
        rawInput: {
          text: "Ada Lovelace, Software Engineer, TypeScript, London"
        },
        candidateProfile: {
          personalInfo: {
            fullName: "Ada Lovelace"
          }
        }
      });
      expect(projects[0].jobTarget).toBeUndefined();
      expect(projects[0].generatedDocuments).toBeUndefined();
    });

    await waitFor(async () => {
      const storedProjects = await listIndexedProjects();

      expect(storedProjects).toHaveLength(1);
      expect(storedProjects[0].candidateProfile?.personalInfo.fullName).toBe(
        "Ada Lovelace"
      );
    });
  });

  it("saves the current context before checking the model during extraction", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            baseUrl: "http://127.0.0.1:11434",
            configuredModel: "",
            reachable: true,
            selectedModelAvailable: false,
            selectedModelLoaded: false,
            checkedAt: "2026-06-01T12:00:00.000Z",
            models: [],
            loadedModels: []
          }
        }),
        { status: 200 }
      )
    );

    render(<ImportScreen />);

    await user.clear(screen.getByLabelText("Candidate context"));
    await user.type(
      screen.getByLabelText("Candidate context"),
      "Saved before extraction"
    );
    await user.click(screen.getByRole("button", { name: "Extract profile" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project).toMatchObject({
        status: "text_imported",
        rawInput: {
          text: "Saved before extraction"
        }
      });
    });
    expect(await screen.findByText(/No Ollama model is loaded/)).toBeInTheDocument();
  });

  it("uses the loaded Ollama model for readiness and extraction", async () => {
    const user = userEvent.setup();
    const selectedModel = "nemotron-3-nano:4b-q8_0";

    window.localStorage.setItem(
      "ollama-cv-selected-model",
      selectedModel
    );
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              baseUrl: "http://127.0.0.1:11434",
              configuredModel: selectedModel,
              reachable: true,
              selectedModelAvailable: true,
              selectedModelLoaded: true,
              checkedAt: "2026-05-25T12:00:00.000Z",
              models: [
                { name: "qwen3.5:4b", loaded: false },
                { name: selectedModel, loaded: true }
              ],
              loadedModels: [{ name: selectedModel }]
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              personalInfo: {
                fullName: "Nora Stein"
              },
              experiences: [],
              education: [],
              skills: {
                technical: [],
                soft: [],
                tools: [],
                languages: [],
                methods: []
              },
              projects: [],
              languages: [],
              certificates: []
            }
          }),
          { status: 200 }
        )
      );

    render(<ImportScreen />);

    await user.click(screen.getByRole("button", { name: "Extract profile" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      `/api/ai/status?model=${encodeURIComponent(selectedModel)}`,
      { cache: "no-store" }
    );
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const extractionRequest = fetchMock.mock.calls[1][1] as RequestInit;

    expect(JSON.parse(extractionRequest.body as string)).toMatchObject({
      model: selectedModel
    });
  });

  it("stops extraction and links to AI Status when the model is not loaded", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            baseUrl: "http://127.0.0.1:11434",
            configuredModel: "qwen3.5:4b",
            reachable: true,
            selectedModelAvailable: true,
            selectedModelLoaded: false,
            checkedAt: "2026-05-25T12:00:00.000Z",
            models: [{ name: "qwen3.5:4b", loaded: false }],
            loadedModels: []
          }
        }),
        { status: 200 }
      )
    );

    render(<ImportScreen />);

    await user.click(screen.getByRole("button", { name: "Extract profile" }));

    expect(await screen.findByText(/is not ready/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open AI Status" })).toHaveAttribute(
      "href",
      "/ai"
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
