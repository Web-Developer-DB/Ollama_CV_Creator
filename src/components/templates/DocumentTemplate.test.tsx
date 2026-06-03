import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GeneratedCoverLetter, GeneratedCV } from "@/types/documents";
import { DocumentTemplate, templateDefinitions } from "./DocumentTemplate";

const cv: GeneratedCV = {
  id: "cv-1",
  title: "Frontend Engineer CV",
  language: "en",
  contact: {
    email: "ada@example.com",
    phone: "+49 30 1234567",
    location: "Berlin",
    linkedin: "linkedin.com/in/ada"
  },
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
  it.each(templateDefinitions.map((template) => template.id))(
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
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("+49 30 1234567")).toBeInTheDocument();
    expect(
      screen.getByText("Frontend engineer focused on accessible React applications.")
    ).toBeInTheDocument();
    expect(screen.getByText("Application for Frontend Engineer")).toBeInTheDocument();
  });

  it("keeps oversized legacy CV summaries short in the profile box", () => {
    render(
      <DocumentTemplate
        cv={{
          ...cv,
          summary:
            "Kurzes Profil.\n\nBerufserfahrung\nSenior Frontend Engineer\nAcme Health GmbH\n2023 - 2026"
        }}
        previewMode="cv"
        template="minimal"
      />
    );

    expect(screen.getByText("Kurzes Profil.")).toBeInTheDocument();
    expect(screen.queryByText(/Berufserfahrung/)).not.toBeInTheDocument();
  });

  it("marks template chrome and document pages for print-only output", () => {
    render(
      <DocumentTemplate
        coverLetter={coverLetter}
        cv={cv}
        previewMode="cv"
        template="minimal"
      />
    );

    const template = screen.getByTestId("template-minimal");

    expect(template.querySelector("[data-print-hidden]")).not.toBeNull();
    expect(template.querySelector("[data-print-pages]")).not.toBeNull();
    expect(screen.getByTestId("document-page-cv")).toBeInTheDocument();
  });

  it("renders long CVs as two A4 preview pages", () => {
    const longCv: GeneratedCV = {
      ...cv,
      sections: [
        {
          id: "experience-long",
          type: "experience",
          title: "Experience",
          items: Array.from({ length: 8 }, (_, index) => ({
            id: `experience-${index + 1}`,
            title: `Frontend Engineer ${index + 1}`,
            subtitle: "Acme GmbH",
            dateRange: "2020 - 2026",
            body: "Built accessible React applications for complex workflows.",
            bullets: [
              "Created reusable interface systems.",
              "Improved document workflow usability.",
              "Supported validation and release quality.",
              "Collaborated with product and engineering teams."
            ]
          }))
        },
        {
          id: "skills",
          type: "skills",
          title: "Skills",
          items: [
            {
              id: "skills-1",
              title: "Technical skills",
              bullets: ["React, TypeScript, Next.js, Playwright, Zod"]
            }
          ]
        }
      ]
    };

    render(<DocumentTemplate cv={longCv} previewMode="cv" template="technical" />);

    expect(screen.getAllByTestId("document-page-cv")).toHaveLength(2);
    expect(screen.getAllByText("Page 2 / 2").length).toBeGreaterThan(0);
  });
});
