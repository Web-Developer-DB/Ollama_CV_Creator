import { deleteDB } from "idb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import { ImportScreen } from "./ImportScreen";

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
      error: undefined
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
      const [project] = useProjectStore.getState().projects;

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
