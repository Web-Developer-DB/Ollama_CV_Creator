import { deleteDB } from "idb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import { DocumentsScreen } from "./DocumentsScreen";

const projectWithDocuments: ApplicationProject = {
  id: "project-1",
  title: "Frontend Engineer at Target GmbH",
  status: "documents_generated",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
  generatedDocuments: {
    cv: {
      id: "cv-1",
      title: "Frontend Engineer CV",
      language: "en",
      summary: "Original CV summary.",
      sections: [],
      meta: {
        generatedAt: "2026-05-24T00:00:00.000Z"
      }
    },
    coverLetter: {
      id: "cover-letter-1",
      language: "en",
      subject: "Application for Frontend Engineer",
      greeting: "Dear hiring team,",
      opening: "Original cover letter opening.",
      body: ["Original cover letter body."],
      closing: "Sincerely,",
      signature: "Ada Lovelace",
      meta: {
        generatedAt: "2026-05-24T00:00:00.000Z"
      }
    }
  }
};

describe("DocumentsScreen", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [projectWithDocuments],
      selectedProjectId: projectWithDocuments.id,
      isLoading: false,
      error: undefined
    });
  });

  it("makes CV text editable", async () => {
    const user = userEvent.setup();

    render(<DocumentsScreen />);

    const cvDraft = screen.getByLabelText("CV draft");
    await user.clear(cvDraft);
    await user.type(cvDraft, "Updated CV draft.");

    expect(cvDraft).toHaveValue("Updated CV draft.");
  });

  it("makes cover letter text editable", async () => {
    const user = userEvent.setup();

    render(<DocumentsScreen />);

    const coverLetterDraft = screen.getByLabelText("Cover letter draft");
    await user.clear(coverLetterDraft);
    await user.type(coverLetterDraft, "Updated cover letter draft.");

    expect(coverLetterDraft).toHaveValue("Updated cover letter draft.");
  });

  it("persists document changes", async () => {
    const user = userEvent.setup();

    render(<DocumentsScreen />);

    const cvDraft = screen.getByLabelText("CV draft");
    await user.clear(cvDraft);
    await user.type(cvDraft, "Persisted CV draft.");

    const coverLetterDraft = screen.getByLabelText("Cover letter draft");
    await user.clear(coverLetterDraft);
    await user.type(coverLetterDraft, "Persisted cover letter draft.");

    await user.click(screen.getByRole("button", { name: "Save documents" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project.generatedDocuments?.cv?.summary).toBe(
        "Persisted CV draft."
      );
      expect(project.generatedDocuments?.coverLetter?.opening).toBe(
        "Persisted cover letter draft."
      );
    });
  });
});
