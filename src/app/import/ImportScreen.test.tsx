import { deleteDB } from "idb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import { ImportScreen } from "./ImportScreen";

describe("ImportScreen", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [],
      selectedProjectId: undefined,
      isLoading: false,
      error: undefined
    });
  });

  it("accepts raw text entry", async () => {
    const user = userEvent.setup();

    render(<ImportScreen />);

    const textArea = screen.getByLabelText("Raw candidate text");
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

    await user.type(
      screen.getByLabelText("Raw candidate text"),
      "Ada Lovelace, Software Engineer, TypeScript, Berlin"
    );
    await user.selectOptions(screen.getByLabelText("Language"), "en");
    await user.click(screen.getByRole("button", { name: "Save import" }));

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
});
