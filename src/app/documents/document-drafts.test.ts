import { describe, expect, it } from "vitest";
import type { GeneratedCV } from "@/types/documents";
import { createCVFromText, cvToText } from "./document-drafts";

const cvWithSummarySection: GeneratedCV = {
  id: "cv-1",
  title: "Nora Stein CV",
  language: "de",
  summary: "Kurzes Profil.",
  sections: [
    {
      id: "section-summary",
      type: "summary",
      title: "Profil",
      items: [
        {
          id: "item-summary",
          body: "Kurzes Profil.",
          bullets: []
        }
      ]
    },
    {
      id: "section-experience",
      type: "experience",
      title: "Berufserfahrung",
      items: [
        {
          id: "item-experience",
          title: "Senior Frontend Engineer",
          subtitle: "Acme Health GmbH",
          dateRange: "2023 - 2026",
          body: "Leitete die Frontend-Entwicklung.",
          bullets: ["Migrierte ein Legacy-Dashboard zu React."]
        }
      ]
    }
  ],
  meta: {
    generatedAt: "2026-06-03T00:00:00.000Z"
  }
};

describe("document draft conversion", () => {
  it("does not duplicate a rendered CV summary section in the editable draft", () => {
    expect(cvToText(cvWithSummarySection)).toBe(
      [
        "Kurzes Profil.",
        "Senior Frontend Engineer\nAcme Health GmbH\n2023 - 2026\nLeitete die Frontend-Entwicklung.\nMigrierte ein Legacy-Dashboard zu React."
      ].join("\n\n")
    );
  });

  it("stores only the first CV draft paragraph as profile summary", () => {
    const saved = createCVFromText(
      [
        "Aktualisiertes Kurzprofil.",
        "Senior Frontend Engineer\nAcme Health GmbH\n2023 - 2026\nLeitete die Frontend-Entwicklung."
      ].join("\n\n"),
      cvWithSummarySection,
      "2026-06-03T12:00:00.000Z"
    );

    expect(saved.summary).toBe("Aktualisiertes Kurzprofil.");
    expect(saved.summary).not.toContain("Senior Frontend Engineer");
    expect(saved.sections).toEqual(cvWithSummarySection.sections);
  });

  it("keeps free-form detail text in a draft section when no structured CV exists", () => {
    const saved = createCVFromText(
      "Aktualisiertes Kurzprofil.\n\nFreier Detailtext.",
      undefined,
      "2026-06-03T12:00:00.000Z"
    );

    expect(saved.summary).toBe("Aktualisiertes Kurzprofil.");
    expect(saved.sections[0]).toMatchObject({
      type: "custom",
      title: "Draft",
      items: [{ body: "Freier Detailtext." }]
    });
  });
});
