import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GeneratedCoverLetter, GeneratedCV } from "@/types/documents";
import type { TemplateStyle } from "@/types/templates";
import { DocumentTemplate, templateDefinitions } from "./DocumentTemplate";

const cv: GeneratedCV = {
  id: "cv-1",
  title: "Frontend Engineer CV",
  language: "en",
  summary: "Frontend engineer focused on accessible React applications.",
  sections: [
    {
      id: "experience",
      type: "experience",
      title: "Experience",
      items: [
        {
          id: "experience-1",
          title: "Frontend Engineer",
          subtitle: "Acme GmbH",
          dateRange: "2022 - Present",
          body: "Built accessible React interfaces.",
          bullets: ["Built accessible components"]
        }
      ]
    }
  ],
  meta: {
    generatedAt: "2026-05-24T00:00:00.000Z"
  }
};

const coverLetter: GeneratedCoverLetter = {
  id: "cover-letter-1",
  language: "en",
  recipient: {
    company: "Target GmbH"
  },
  subject: "Application for Frontend Engineer",
  greeting: "Dear hiring team,",
  opening: "I am applying for the Frontend Engineer role.",
  body: ["My React work at Acme GmbH fits the role."],
  closing: "Sincerely,",
  signature: "Ada Lovelace",
  meta: {
    generatedAt: "2026-05-24T00:00:00.000Z"
  }
};

describe("DocumentTemplate", () => {
  it.each(["modern", "classic", "minimal"] satisfies TemplateStyle[])(
    "renders the %s template",
    (template) => {
      render(<DocumentTemplate coverLetter={coverLetter} cv={cv} template={template} />);

      expect(screen.getByTestId(`template-${template}`)).toBeInTheDocument();
      expect(
        screen.getByText(
          templateDefinitions.find((definition) => definition.id === template)
            ?.name ?? ""
        )
      ).toBeInTheDocument();
    }
  );

  it("does not crash when optional fields are missing", () => {
    render(
      <DocumentTemplate
        coverLetter={{
          id: "cover-letter-empty",
          language: "en",
          opening: "Opening only.",
          body: [],
          closing: "Sincerely,",
          meta: {
            generatedAt: "2026-05-24T00:00:00.000Z"
          }
        }}
        cv={{
          id: "cv-empty",
          language: "en",
          sections: [],
          meta: {
            generatedAt: "2026-05-24T00:00:00.000Z"
          }
        }}
        template="minimal"
      />
    );

    expect(screen.getByText("Untitled CV")).toBeInTheDocument();
    expect(
      screen.getByText("CV preview is waiting for content")
    ).toBeInTheDocument();
    expect(screen.getByText("Opening only.")).toBeInTheDocument();
  });

  it("renders CV and cover letter previews", () => {
    render(<DocumentTemplate coverLetter={coverLetter} cv={cv} template="modern" />);

    expect(screen.getByTestId("document-page-cv")).toBeInTheDocument();
    expect(screen.getByTestId("document-page-cover-letter")).toBeInTheDocument();
    expect(screen.getByText("Curriculum vitae")).toBeInTheDocument();
    expect(screen.getByText("Cover letter")).toBeInTheDocument();
    expect(
      screen.getByText("Frontend engineer focused on accessible React applications.")
    ).toBeInTheDocument();
    expect(screen.getByText("Application for Frontend Engineer")).toBeInTheDocument();
  });
});
