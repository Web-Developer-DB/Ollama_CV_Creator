import { deleteDB } from "idb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
      contact: {
        email: "ada@example.com",
        linkedin: "linkedin.com/in/ada"
      },
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
  let printMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    window.history.replaceState(null, "", "/templates");
    printMock = vi.fn();
    Object.assign(window, {
      print: printMock,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);

        return 1;
      }
    });
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
    expect(screen.getByRole("button", { name: "Executive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Technical" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compact" })).toBeInTheDocument();
    expect(screen.getByTestId("document-page-cv")).toBeInTheDocument();
    expect(
      screen.getByTestId("document-page-cover-letter")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "CV als PDF drucken" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Anschreiben drucken" })
    ).toBeInTheDocument();
  });

  it("shows a document creation empty state before previews exist", () => {
    useProjectStore.setState({
      projects: [
        {
          ...projectWithDocuments,
          generatedDocuments: undefined,
          status: "profile_reviewed"
        }
      ],
      selectedProjectId: projectWithDocuments.id,
      isLoading: false,
      error: undefined
    });

    render(<TemplatesScreen />);

    expect(screen.getByText("Erstelle zuerst Dokumente")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Dokumente erstellen" })
    ).toHaveAttribute("href", "/documents");
    expect(screen.queryByTestId("document-page-cv")).not.toBeInTheDocument();
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
    expect(screen.getAllByText("Frontend Engineer").length).toBeGreaterThan(0);
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("opens a requested preview mode from the document workflow", () => {
    window.history.replaceState(null, "", "/templates?preview=cover_letter");

    render(<TemplatesScreen />);

    expect(screen.queryByTestId("document-page-cv")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("document-page-cover-letter")
    ).toBeInTheDocument();
  });

  it("prints the selected CV preview through the browser print dialog", async () => {
    const user = userEvent.setup();

    render(<TemplatesScreen />);

    await user.click(screen.getByRole("button", { name: "CV als PDF drucken" }));

    await waitFor(() => {
      expect(screen.getByTestId("document-page-cv")).toBeInTheDocument();
      expect(
        screen.queryByTestId("document-page-cover-letter")
      ).not.toBeInTheDocument();
      expect(printMock).toHaveBeenCalledTimes(1);
    });
  });

  it("filters templates by category", async () => {
    const user = userEvent.setup();

    render(<TemplatesScreen />);

    await user.selectOptions(screen.getByLabelText("Kategorie"), "technical");

    expect(screen.getByRole("button", { name: "Technical" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modern" })).not.toBeInTheDocument();
  });
});
