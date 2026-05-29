import { deleteDB } from "idb";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import { TemplatesScreen } from "./TemplatesScreen";

const projectWithDocuments: ApplicationProject = {
  id: "project-1",
  title: "Frontend Engineer at Target GmbH",
  status: "documents_generated",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
  designSettings: {
    template: "modern"
  },
  generatedDocuments: {
    cv: {
      id: "cv-1",
      title: "Frontend Engineer CV",
      language: "en",
      summary: "Frontend engineer focused on accessible React applications.",
      sections: [],
      meta: {
        generatedAt: "2026-05-24T00:00:00.000Z"
      }
    },
    coverLetter: {
      id: "cover-letter-1",
      language: "en",
      subject: "Application for Frontend Engineer",
      opening: "I am applying for the Frontend Engineer role.",
      body: ["My React work fits the role."],
      closing: "Sincerely,",
      signature: "Ada Lovelace",
      meta: {
        generatedAt: "2026-05-24T00:00:00.000Z"
      }
    }
  }
};

describe("TemplatesScreen", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    useProjectStore.setState({
      projects: [projectWithDocuments],
      selectedProjectId: projectWithDocuments.id,
      isLoading: false,
      error: undefined
    });
  });

  it("renders template options and document previews", () => {
    render(<TemplatesScreen />);

    expect(screen.getByRole("button", { name: "Modern" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Classic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Minimal" })).toBeInTheDocument();
    expect(screen.getByTestId("document-page-cv")).toBeInTheDocument();
    expect(
      screen.getByTestId("document-page-cover-letter")
    ).toBeInTheDocument();
  });

  it("switches the visible template", async () => {
    const user = userEvent.setup();

    render(<TemplatesScreen />);

    expect(screen.getByTestId("template-modern")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Minimal" }));

    expect(screen.getByTestId("template-minimal")).toBeInTheDocument();
    expect(screen.queryByTestId("template-modern")).not.toBeInTheDocument();
  });

  it("toggles between CV and cover letter previews", async () => {
    const user = userEvent.setup();

    render(<TemplatesScreen />);

    await user.click(screen.getByRole("button", { name: "Cover letter" }));

    expect(screen.queryByTestId("document-page-cv")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("document-page-cover-letter")
    ).toBeInTheDocument();
    expect(screen.getByText("Application for Frontend Engineer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "CV" }));

    expect(screen.getByTestId("document-page-cv")).toBeInTheDocument();
    expect(
      screen.queryByTestId("document-page-cover-letter")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer CV")).toBeInTheDocument();
  });
});
